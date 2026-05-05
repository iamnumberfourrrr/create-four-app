import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * db-shared installer — drops files common to ALL db variants.
 *
 * Does NOT drop dialect-specific files (drizzle.config.ts, client.ts,
 * package.json deps). Those are owned by db-sqlite / db-mixed-pg / db-postgres.
 *
 * Runs whenever db !== false.
 */

const DB_INDEX_TS = `/**
 * packages/db — public entry point.
 * Re-exports the database client and all schemas for consumers.
 *
 * Consumers (apps/web server functions, apps/worker):
 *   import { db } from "@{{projectScope}}/db"
 *   import { users } from "@{{projectScope}}/db/schema"
 */
export { db } from "./client.js";
export * from "./schema/index.js";
`;

const SCHEMA_INDEX_TS = `/**
 * Schema barrel — re-exports every table from the schema directory.
 * Phase 05 (auth) drops auth.ts here; phase 04 drops jobs.ts (sqlite-poll).
 * All are auto-picked — just add exports below when new schema files appear.
 */
export * from "./users.js";
`;

const DB_TSCONFIG_JSON = `{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src/**/*.ts", "drizzle.config.ts"]
}
`;

const DB_ENV_FRAGMENT_TS = `import { z } from "zod";

/**
 * Database env fragment.
 * Supports postgres:// / pglite:// / file: URLs.
 * Composed automatically by packages/config/env/index.ts via glob.
 */
export const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL must not be empty")
    .refine(
      (v) =>
        v.startsWith("postgres://") ||
        v.startsWith("postgresql://") ||
        v.startsWith("pglite://") ||
        v.startsWith("file:"),
      {
        message:
          "DATABASE_URL must start with postgres://, postgresql://, pglite://, or file:",
      },
    ),
});
`;

const dbSharedInstaller: Installer = {
  name: "db-shared",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    const db = modules["db"];
    if (!db) return [];

    const dbPkg = join("packages", "db");
    const projectScope = `@${ctx.projectName}`;

    const ops: FileOp[] = [
      // packages/db directory scaffold
      { kind: "mkdir", path: dbPkg },
      { kind: "mkdir", path: join(dbPkg, "src", "schema") },
      { kind: "mkdir", path: join(dbPkg, "migrations") },

      // migrations/.gitkeep — ensures committed dir exists
      {
        kind: "write",
        path: join(dbPkg, "migrations", ".gitkeep"),
        content: "",
      },

      // tsconfig.json
      {
        kind: "write",
        path: join(dbPkg, "tsconfig.json"),
        content: DB_TSCONFIG_JSON,
      },

      // src/index.ts
      {
        kind: "write",
        path: join(dbPkg, "src", "index.ts"),
        content: DB_INDEX_TS.replace(/\{\{projectScope\}\}/g, projectScope),
      },

      // src/schema/index.ts
      {
        kind: "write",
        path: join(dbPkg, "src", "schema", "index.ts"),
        content: SCHEMA_INDEX_TS,
      },

      // src/schema/users.ts — written by dialect installers (sqlite vs pg column types)

      // packages/db/package.json base (deps filled in by dialect installers)
      {
        kind: "merge-json",
        path: join(dbPkg, "package.json"),
        patch: {
          name: `${projectScope}/db`,
          version: "0.1.0",
          private: true,
          type: "module",
          exports: {
            ".": "./src/index.ts",
          },
          scripts: {
            "db:push": "drizzle-kit push",
            "db:generate": "drizzle-kit generate",
            "db:migrate": "drizzle-kit migrate",
            "db:studio": "drizzle-kit studio",
            typecheck: "tsc --noEmit",
          },
          devDependencies: {
            "drizzle-kit": "0.30.6",
            typescript: "5.8.3",
          },
        },
      },

      // Env fragment for DATABASE_URL
      {
        kind: "write",
        path: join("packages", "config", "env", "fragments", "db.ts"),
        content: DB_ENV_FRAGMENT_TS,
      },

      // Root package.json db script shortcuts
      {
        kind: "merge-json",
        path: "package.json",
        patch: {
          scripts: {
            "db:push": "pnpm --filter db db:push",
            "db:generate": "pnpm --filter db db:generate",
            "db:migrate": "pnpm --filter db db:migrate",
            "db:studio": "pnpm --filter db db:studio",
          },
        },
      },

      // pnpm-workspace.yaml — ensure packages/* is present
      {
        kind: "merge-yaml",
        path: "pnpm-workspace.yaml",
        patch: {
          packages: ["apps/*", "packages/*"],
        },
      },
    ];

    return ops;
  },
};

register(dbSharedInstaller);

export { dbSharedInstaller };
