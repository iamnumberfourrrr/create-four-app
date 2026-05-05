import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * worker-sqlite-poll installer.
 *
 * Runs when worker === "sqlite-poll" (db === "sqlite").
 *
 * Strategy B: runs AFTER the phase-02 "worker" stub installer.
 * Overwrites apps/worker/src/index.ts with a polling loop that reads
 * a `jobs` table in SQLite and dispatches to registered handlers.
 *
 * Also drops:
 *   - apps/worker/src/queue.ts  — poller implementation
 *   - apps/worker/src/jobs/example.ts  — delete-me handler
 *   - packages/db/src/schema/jobs.ts  — jobs table schema (sqlite-only)
 *   - packages/config/env/fragments/worker.ts  — WORKER_POLL_INTERVAL_MS
 */

const WORKER_INDEX_TS = `import { startPoller } from "./queue.js";
import { exampleHandler } from "./jobs/example.js";

/**
 * Worker entry point — SQLite polling queue consumer.
 *
 * Polls the jobs table for pending work, dispatches to registered
 * handlers, and marks jobs done/failed. Graceful shutdown on SIGINT/SIGTERM.
 *
 * WORKER_POLL_INTERVAL_MS controls the poll cadence (default: 1000ms).
 */

console.info("[worker] starting sqlite-poll worker...");

const handlers = new Map([
  [exampleHandler.name, exampleHandler.handler],
]);

const stop = await startPoller(handlers);

process.on("SIGINT", () => {
  console.info("[worker] shutting down...");
  stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.info("[worker] shutting down...");
  stop();
  process.exit(0);
});

console.info("[worker] ready, polling for jobs...");
`;

const QUEUE_TS = `import { db } from "@{{projectScope}}/db";
import { jobs } from "@{{projectScope}}/db/schema";
import { eq, asc } from "drizzle-orm";
import { env } from "@{{projectScope}}/config/env";

/**
 * SQLite polling queue.
 *
 * Schema: packages/db/src/schema/jobs.ts
 *
 * Flow per tick:
 *   1. SELECT one pending job (FIFO by createdAt)
 *   2. Mark in-progress (optimistic — no DB-level locking needed for single worker)
 *   3. Dispatch to registered handler
 *   4. Mark done or failed with error message
 *
 * Single-worker assumption: no distributed locking. If you scale to multiple
 * worker processes, switch to pg-boss (select db=postgres in create-four-app).
 */

export type JobPayload = Record<string, unknown>;
export type JobHandler = (payload: JobPayload) => Promise<void>;

async function processTick(handlers: Map<string, JobHandler>): Promise<void> {
  // Fetch oldest pending job
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "pending"))
    .orderBy(asc(jobs.createdAt))
    .limit(1);

  if (!job) return;

  // Mark in-progress
  await db
    .update(jobs)
    .set({ status: "in-progress", startedAt: new Date() })
    .where(eq(jobs.id, job.id));

  const handler = handlers.get(job.type);
  if (!handler) {
    await db
      .update(jobs)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: \`No handler registered for job type: \${job.type}\`,
      })
      .where(eq(jobs.id, job.id));
    console.warn(\`[worker] no handler for job type "\${job.type}" (id: \${job.id})\`);
    return;
  }

  try {
    const payload = JSON.parse(job.payload) as JobPayload;
    await handler(payload);
    await db
      .update(jobs)
      .set({ status: "done", finishedAt: new Date() })
      .where(eq(jobs.id, job.id));
    console.info(\`[worker] job \${job.id} (\${job.type}) done\`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(jobs)
      .set({ status: "failed", finishedAt: new Date(), error: message })
      .where(eq(jobs.id, job.id));
    console.error(\`[worker] job \${job.id} (\${job.type}) failed:\`, message);
  }
}

/**
 * Starts the polling loop. Returns a stop() function for graceful shutdown.
 */
export async function startPoller(
  handlers: Map<string, JobHandler>,
): Promise<() => void> {
  const intervalMs = env.WORKER_POLL_INTERVAL_MS;
  let running = true;

  async function loop(): Promise<void> {
    while (running) {
      try {
        await processTick(handlers);
      } catch (err: unknown) {
        console.error("[worker] poll error:", err);
      }
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }
    console.info("[worker] poller stopped");
  }

  // Start loop without blocking startup
  loop().catch((err: unknown) => {
    console.error("[worker] poller crashed:", err);
    process.exit(1);
  });

  return () => {
    running = false;
  };
}
`;

const EXAMPLE_JOB_TS = `// DELETE ME — example job handler. Replace with your own job definitions.
import type { JobHandler } from "../queue.js";

/**
 * Example job: "echo"
 *
 * Receives a { message: string } payload and logs it.
 * Enqueue via: db.insert(jobs).values({ type: "echo", payload: JSON.stringify({ message: "hi" }) })
 */

const handler: JobHandler = async (payload) => {
  const message = typeof payload["message"] === "string" ? payload["message"] : "(no message)";
  console.info(\`[echo] \${message}\`);
};

export const exampleHandler = {
  name: "echo" as const,
  handler,
};
`;

const JOBS_SCHEMA_TS = `// Jobs table for sqlite-poll worker queue.
// Consumed by apps/worker/src/queue.ts.
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  payload: text("payload").notNull().default("{}"),
  status: text("status", {
    enum: ["pending", "in-progress", "done", "failed"],
  })
    .notNull()
    .default("pending"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
`;

const WORKER_ENV_FRAGMENT_TS = `import { z } from "zod";

/**
 * Worker env fragment — sqlite-poll specific.
 * Composed automatically by packages/config/env/index.ts via glob.
 */
export const schema = z.object({
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
});
`;

const workerSqlitePollInstaller: Installer = {
  name: "worker-sqlite-poll",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    if (modules["worker"] !== "sqlite-poll") return [];

    const workerSrc = join("apps", "worker", "src");
    const projectScope = `@${ctx.projectName}`;

    const replace = (s: string) => s.replace(/\{\{projectScope\}\}/g, projectScope);

    return [
      // Overwrite the phase-02 stub index.ts with polling boot
      {
        kind: "write",
        path: join(workerSrc, "index.ts"),
        content: WORKER_INDEX_TS,
        overwrite: true,
      },

      // queue.ts — polling loop implementation
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

      // packages/db/src/schema/jobs.ts — jobs table (sqlite-only addition)
      {
        kind: "write",
        path: join("packages", "db", "src", "schema", "jobs.ts"),
        content: JOBS_SCHEMA_TS,
      },

      // Append jobs export to schema barrel
      {
        kind: "append",
        path: join("packages", "db", "src", "schema", "index.ts"),
        content: 'export * from "./jobs.js";\n',
      },

      // Env fragment for WORKER_POLL_INTERVAL_MS
      {
        kind: "write",
        path: join("packages", "config", "env", "fragments", "worker.ts"),
        content: WORKER_ENV_FRAGMENT_TS,
      },

      // .env.example — worker poll interval
      {
        kind: "append",
        path: ".env.example",
        content: "\n# Worker (sqlite-poll)\nWORKER_POLL_INTERVAL_MS=1000\n",
      },
    ];
  },
};

register(workerSqlitePollInstaller);

export { workerSqlitePollInstaller };
