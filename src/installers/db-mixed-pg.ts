import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * mixed-pg db installer — PGlite (dev) + postgres (prod) in one package.
 *
 * The client factory branches on DATABASE_URL prefix at runtime:
 *   pglite://  → @electric-sql/pglite (embedded, zero-infra dev)
 *   postgres:// / postgresql:// → pg Pool (staging/prod)
 *
 * Both share identical drizzle config (dialect=postgresql) so migrations
 * are the same SQL regardless of which driver you're using.
 *
 * Runs when db === "mixed-pg".
 */

const DRIZZLE_CONFIG_TS = `import { defineConfig } from "drizzle-kit";
import { env } from "../config/env/index.ts";

/**
 * Drizzle Kit config — PostgreSQL dialect.
 *
 * For pglite local dev: use a postgres:// DATABASE_URL (pglite doesn't
 * support drizzle-kit's push directly; use a local Postgres for migrations,
 * pglite for runtime dev). Alternatively run pnpm db:push with a compose DB.
 *
 * Schema glob picks up all *.ts files under src/schema/:
 *   users.ts (base), auth.ts (phase 05)
 *
 * Run: pnpm db:push     — push schema directly (requires postgres:// URL)
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

const CLIENT_TS = `import { env } from "@{{projectScope}}/config/env";
import * as schema from "./schema/index.js";

/**
 * Drizzle client factory — mixed-pg variant.
 *
 * Branches on DATABASE_URL prefix:
 *   pglite://  → @electric-sql/pglite (embedded SQLite-compatible Postgres, dev only)
 *   postgres:// / postgresql:// → pg Pool (production)
 *
 * Both paths return a Drizzle client with full schema inference.
 *
 * DATABASE_URL never logged — validated at startup by env fragment.
 *
 * NOTE: pg-boss (worker queue) requires a real Postgres URL — pglite does
 * not support LISTEN/NOTIFY. Set DATABASE_URL=postgres://... when running workers.
 */
async function makeClient() {
  const url = env.DATABASE_URL;

  if (url.startsWith("pglite://")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const dataDir = url.slice("pglite://".length);
    return drizzle(new PGlite(dataDir), { schema });
  }

  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  return drizzle(new Pool({ connectionString: url }), { schema });
}

// Singleton client — resolved once at module load.
// Use top-level await (Node 22 ESM, tsx).
export const db = await makeClient();
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

const SETUP_SECTION_MIXED_PG = `
## Database (mixed-pg: PGlite for dev, Postgres for prod)

The client at \`packages/db/src/client.ts\` switches at runtime based on
\`DATABASE_URL\`:

- \`pglite://./.pglite-data\` → embedded PGlite (zero-install local dev).
- \`postgres://...\` or \`postgresql://...\` → real Postgres.

### Local dev

Default works. The first \`pnpm db:push\` creates \`./.pglite-data/\`.

### Production

Set \`DATABASE_URL\` to a real Postgres URL in your deployed env (or in
\`.env.production\`). Recommended providers: Neon, Supabase, Railway.

If deploying to Cloudflare with the \`wrangler\` module, also run
\`pnpm cf:hyperdrive\` to wire the Hyperdrive binding (see the
Cloudflare Hyperdrive section).

### Apply the schema

\`\`\`
pnpm db:push
pnpm db:generate
pnpm db:migrate
pnpm db:studio
\`\`\`

---
`;

const dbMixedPgInstaller: Installer = {
  name: "db-mixed-pg",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    if (modules["db"] !== "mixed-pg") return [];

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
            "@electric-sql/pglite": "0.2.17",
          },
          devDependencies: {
            "@types/pg": "8.11.11",
          },
        },
      },

      // .env.example — DATABASE_URL entry (pglite for dev)
      {
        kind: "append",
        path: ".env.example",
        content:
          "\n# Database (mixed-pg: pglite for dev, postgres:// for prod)\nDATABASE_URL=pglite://./.pglite-data\n",
      },

      // .gitignore — ignore pglite local data dir
      {
        kind: "append",
        path: ".gitignore",
        content: "\n# PGlite local data directory\n.pglite-data/\n",
      },

      // SETUP.md — explain mixed-pg dual-target behavior
      {
        kind: "append",
        path: "SETUP.md",
        content: SETUP_SECTION_MIXED_PG,
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

register(dbMixedPgInstaller);

export { dbMixedPgInstaller };
