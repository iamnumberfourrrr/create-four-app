import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * SQLite (libsql) db installer.
 *
 * Drops:
 *   - drizzle.config.ts (dialect=sqlite, driver=turso)
 *   - src/client.ts (libsql via @libsql/client)
 *   - src/schema/users.ts (sqlite column types)
 *   - packages/db/package.json deps merge (drizzle-orm, @libsql/client)
 *   - .env.example DATABASE_URL entry
 *
 * Runs when db === "sqlite".
 */

const DRIZZLE_CONFIG_TS = `import { defineConfig } from "drizzle-kit";
import { env } from "../config/env/index.ts";

/**
 * Drizzle Kit config — SQLite / libsql dialect.
 *
 * Schema glob picks up all *.ts files under src/schema/:
 *   users.ts (base), jobs.ts (worker-sqlite-poll), auth.ts (phase 05)
 *
 * Run: pnpm db:push   — push schema directly to dev DB (no migration file)
 *      pnpm db:generate — generate SQL migration files
 *      pnpm db:migrate  — apply pending migrations
 *      pnpm db:studio   — launch Drizzle Studio GUI
 */
export default defineConfig({
  dialect: "sqlite",
  driver: "turso",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  schema: "./src/schema/**/*.ts",
  out: "./migrations",
  verbose: true,
  strict: true,
});
`;

const CLIENT_TS = `import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "@{{projectScope}}/config/env";
import * as schema from "./schema/index.js";

/**
 * Drizzle client — SQLite / libsql.
 *
 * Works with:
 *   - Local SQLite:  DATABASE_URL=file:./local.db
 *   - Turso remote: DATABASE_URL=libsql://<db>.turso.io  AUTH_TOKEN=<token>
 *
 * DATABASE_URL never logged — validated at startup by env fragment.
 */
const client = createClient({ url: env.DATABASE_URL });

export const db = drizzle(client, { schema });
`;

const USERS_SCHEMA_TS = `// DELETE ME — example schema. Replace or extend with your own tables.
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`;

const SETUP_SECTION_SQLITE = `
## SQLite database

The default \`DATABASE_URL=file:./local.db\` works as-is — no provisioning
needed. The DB file is created on first connection and gitignored.

### Apply the schema

\`\`\`
pnpm db:push       # fast — pushes current schema, no migration files
pnpm db:generate   # creates SQL migrations under packages/db/migrations
pnpm db:migrate    # applies migration files (use this in production)
pnpm db:studio     # browse + edit data in a local web UI
\`\`\`

### Hosted SQLite (Turso, etc.)

Replace \`DATABASE_URL\` with the hosted libsql URL plus auth token:

\`\`\`
DATABASE_URL=libsql://<your-db>.turso.io
DATABASE_AUTH_TOKEN=<token>
\`\`\`

(You'll need to wire \`DATABASE_AUTH_TOKEN\` into \`packages/db/src/client.ts\`
when moving off file-based SQLite.)

---
`;

const dbSqliteInstaller: Installer = {
  name: "db-sqlite",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    if (modules["db"] !== "sqlite") return [];

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

      // src/schema/users.ts (sqlite column types)
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
            "@libsql/client": "0.15.4",
          },
        },
      },

      // .env.example — DATABASE_URL entry
      {
        kind: "append",
        path: ".env.example",
        content: "\n# Database (SQLite / libsql)\nDATABASE_URL=file:./local.db\n",
      },

      // .gitignore — local SQLite files
      {
        kind: "append",
        path: ".gitignore",
        content: "\n# Local SQLite files\n*.db\n*.db-journal\n*.db-wal\n*.db-shm\nlocal.db*\n",
      },

      // SETUP.md — sqlite is mostly automatic, just note migrations
      {
        kind: "append",
        path: "SETUP.md",
        content: SETUP_SECTION_SQLITE,
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

register(dbSqliteInstaller);

export { dbSqliteInstaller };
