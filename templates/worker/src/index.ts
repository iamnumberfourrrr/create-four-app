/**
 * Worker entry point.
 *
 * Phase 04 (data installer) will augment this file with a real queue
 * (pg-boss or sqlite-poll). For now it simply starts and logs that no
 * queue is configured — so `pnpm dev` in the root workspace succeeds.
 *
 * NOTE: Using `tsx watch` as the dev runner (fallback from vite-plus worker
 * entry mode). vite-plus worker entry is not yet GA; switch when stable.
 */

console.info("[worker] starting...");

async function start(): Promise<void> {
  // Phase 04 will replace this block with queue initialization.
  console.info("[worker] ready, no queue configured");
  console.info("[worker] add db + worker modules via: create-four-app add worker");
}

start().catch((err: unknown) => {
  console.error("[worker] fatal error:", err);
  process.exit(1);
});
