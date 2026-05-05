import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * PostgreSQL db installer.
 *
 * Drops:
 *   - drizzle.config.ts (dialect=postgresql)
 *   - src/client.ts (pg Pool via drizzle-orm/node-postgres)
 *   - src/schema/users.ts (pg column types)
 *   - packages/db/package.json deps merge (drizzle-orm, pg, @types/pg)
 *   - .env.example DATABASE_URL entry
 *   - apps/web/src/server/db.ts re-export (Start framework only)
 *
 * Runs when db === "postgres".
 */

const DRIZZLE_CONFIG_TS = `import { defineConfig } from "drizzle-kit";
import { env } from "../config/env/index.ts";

/**
 * Drizzle Kit config — PostgreSQL dialect.
 *
 * Schema glob picks up all *.ts files under src/schema/:
 *   users.ts (base), auth.ts (phase 05)
 *
 * Run: pnpm db:push     — push schema directly to dev DB (no migration file)
 *      pnpm db:generate — generate SQL migration files
 *      pnpm db:migrate  — apply pending migrations
 *      pnpm db:studio   — launch Drizzle Studio GUI
 */
export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  schema: "./src/schema/**/*.ts",
  out: "./migrations",
  verbose: true,
  strict: true,
});
`;

const CLIENT_TS = `import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@{{projectScope}}/config/env";
import * as schema from "./schema/index.js";

/**
 * Drizzle client — PostgreSQL via pg Pool.
 *
 * DATABASE_URL never logged — validated at startup by env fragment.
 *
 * Pool is shared across the process lifetime. Do not create multiple
 * instances — import { db } from "@{{projectScope}}/db" everywhere.
 */
const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });
`;

const USERS_SCHEMA_TS = `// DELETE ME — example schema. Replace or extend with your own tables.
import { text, serial, timestamp, pgTable } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`;

const dbPostgresInstaller: Installer = {
  name: "db-postgres",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    if (modules["db"] !== "postgres") return [];

    const dbPkg = join("packages", "db");
    const projectScope = `@${ctx.projectName}`;

    const ops: FileOp[] = [
      // drizzle.config.ts
      {
        kind: "write",
        path: join(dbPkg, "drizzle.config.ts"),
        content: DRIZZLE_CONFIG_TS,
      },

      // src/client.ts
      {
        kind: "write",
        path: join(dbPkg, "src", "client.ts"),
        content: CLIENT_TS.replace(/\{\{projectScope\}\}/g, projectScope),
      },

      // src/schema/users.ts (pg column types)
      {
        kind: "write",
        path: join(dbPkg, "src", "schema", "users.ts"),
        content: USERS_SCHEMA_TS,
      },

      // packages/db/package.json deps
      {
        kind: "merge-json",
        path: join(dbPkg, "package.json"),
        patch: {
          dependencies: {
            "drizzle-orm": "0.43.1",
            pg: "8.16.0",
          },
          devDependencies: {
            "@types/pg": "8.11.11",
          },
        },
      },

      // .env.example — DATABASE_URL entry
      {
        kind: "append",
        path: ".env.example",
        content: `\n# Database (PostgreSQL)\nDATABASE_URL=postgres://postgres:postgres@localhost:5432/${ctx.projectName}\n`,
      },
    ];

    // Wire apps/web/src/server/db.ts for TanStack Start (SSR/server functions)
    if (ctx.framework === "tanstack-start") {
      ops.push({
        kind: "write",
        path: join("apps", "web", "src", "server", "db.ts"),
        content: buildWebDbReexport(projectScope),
      });
    }

    return ops;
  },
};

function buildWebDbReexport(projectScope: string): string {
  return `/**
 * Server-side db re-export for TanStack Start server functions.
 *
 * Usage in server functions / API routes:
 *   import { db } from "~/server/db"
 *
 * Do NOT import this in client-side code — it will fail.
 */
export { db } from "${projectScope}/db";
`;
}

register(dbPostgresInstaller);

export { dbPostgresInstaller };
