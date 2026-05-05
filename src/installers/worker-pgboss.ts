import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * worker-pgboss installer.
 *
 * Runs when worker === "pgboss" (db ∈ postgres | mixed-pg).
 *
 * Strategy B: this installer runs AFTER the phase-02 "worker" stub installer.
 * It overwrites apps/worker/src/index.ts (overwrite: true) with the pg-boss
 * boot sequence and drops queue.ts + jobs/example.ts alongside it.
 *
 * pg-boss creates its own `pgboss` schema in Postgres on first start —
 * no conflicts with user tables in the public schema.
 *
 * NOTE: pg-boss requires a real Postgres URL. pglite (mixed-pg dev) does NOT
 * support LISTEN/NOTIFY which pg-boss relies on. Set DATABASE_URL=postgres://...
 * when running apps/worker in the mixed-pg setup.
 */

const WORKER_INDEX_TS = `import { boss } from "./queue.js";
import { env } from "@{{projectScope}}/config/env";

/**
 * Worker entry point — pg-boss queue consumer.
 *
 * Boots pg-boss, registers all job handlers from ./jobs/, then waits.
 * Shuts down cleanly on SIGINT / SIGTERM.
 *
 * pg-boss creates a "pgboss" schema in Postgres on first start.
 * This does not conflict with user tables in the public schema.
 *
 * DATABASE_URL: must be a postgres:// or postgresql:// URL.
 * pglite:// is NOT supported here (no LISTEN/NOTIFY).
 */

console.info("[worker] starting pg-boss worker...");
console.info("[worker] connecting to database...");

// Register job handlers
// Each handler module default-exports: { name: string, handler: WorkerHandler }
const { exampleHandler } = await import("./jobs/example.js");

async function start(): Promise<void> {
  await boss.start();
  console.info("[worker] pg-boss started");

  // Register handlers
  await boss.work(exampleHandler.name, exampleHandler.handler);
  console.info(\`[worker] registered handler: \${exampleHandler.name}\`);

  console.info("[worker] ready, waiting for jobs...");
}

async function shutdown(): Promise<void> {
  console.info("[worker] shutting down...");
  await boss.stop({ graceful: true, timeout: 10_000 });
  console.info("[worker] shutdown complete");
  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown().catch((err: unknown) => {
    console.error("[worker] shutdown error:", err);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown().catch((err: unknown) => {
    console.error("[worker] shutdown error:", err);
    process.exit(1);
  });
});

start().catch((err: unknown) => {
  console.error("[worker] fatal error:", err);
  process.exit(1);
});
`;

const QUEUE_TS = `import PgBoss from "pg-boss";
import { env } from "@{{projectScope}}/config/env";

/**
 * pg-boss singleton factory.
 *
 * pg-boss manages its own "pgboss" schema in Postgres — no migration
 * conflicts with user tables. On first start it runs its own schema setup.
 *
 * Exported as a singleton so index.ts and job handlers share one instance.
 */
export const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  // Retain completed jobs for 7 days before archival
  archiveCompletedAfterSeconds: 60 * 60 * 24 * 7,
});

boss.on("error", (err: unknown) => {
  console.error("[pg-boss] internal error:", err);
});
`;

const EXAMPLE_JOB_TS = `// DELETE ME — example job handler. Replace with your own job definitions.
import type { WorkHandler } from "pg-boss";

/**
 * Example job: "echo"
 *
 * Receives a { message: string } payload and logs it.
 * Register more handlers in apps/worker/src/index.ts the same way.
 */

interface EchoPayload {
  message: string;
}

const handler: WorkHandler<EchoPayload> = async (job) => {
  console.info(\`[echo] job \${job.id}: \${job.data.message}\`);
};

export const exampleHandler = {
  name: "echo" as const,
  handler,
};
`;

const workerPgbossInstaller: Installer = {
  name: "worker-pgboss",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    if (modules["worker"] !== "pgboss") return [];

    const workerSrc = join("apps", "worker", "src");
    const projectScope = `@${ctx.projectName}`;

    const replace = (s: string) => s.replace(/\{\{projectScope\}\}/g, projectScope);

    return [
      // Overwrite the phase-02 stub index.ts with pg-boss boot
      {
        kind: "write",
        path: join(workerSrc, "index.ts"),
        content: replace(WORKER_INDEX_TS),
        overwrite: true,
      },

      // queue.ts — pg-boss singleton
      {
        kind: "write",
        path: join(workerSrc, "queue.ts"),
        content: replace(QUEUE_TS),
      },

      // jobs/example.ts — delete-me example handler
      {
        kind: "write",
        path: join(workerSrc, "jobs", "example.ts"),
        content: EXAMPLE_JOB_TS,
      },

      // Add pg-boss dep to apps/worker/package.json
      {
        kind: "merge-json",
        path: join("apps", "worker", "package.json"),
        patch: {
          dependencies: {
            "pg-boss": "10.1.5",
          },
        },
      },
    ];
  },
};

register(workerPgbossInstaller);

export { workerPgbossInstaller };
