import { rm } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { logger } from "../utils/logger.js";

interface RollbackOptions {
  projectDir: string;
  noRollback: boolean;
  inExisting: boolean;
}

let rollbackTarget: string | null = null;
let rollbackEnabled = true;

export function configureRollback(opts: RollbackOptions): void {
  rollbackTarget = resolve(opts.projectDir);
  rollbackEnabled = !opts.noRollback && !opts.inExisting;
}

export function disableRollback(): void {
  rollbackEnabled = false;
}

async function performRollback(): Promise<void> {
  if (!rollbackEnabled || rollbackTarget === null) return;

  // Safety: never delete above cwd
  const cwd = resolve(process.cwd());
  const rel = relative(cwd, rollbackTarget);
  if (rel.startsWith("..") || rel === "") {
    logger.warn("Rollback skipped: target dir is at or above cwd");
    return;
  }

  logger.warn(`Rolling back: removing ${rollbackTarget}`);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rm(rollbackTarget, { recursive: true, force: true });
      logger.dim("Rollback complete.");
      return;
    } catch (err) {
      if (attempt < 2) {
        await new Promise((res) => setTimeout(res, 100));
      } else {
        logger.error(`Rollback failed after 3 attempts: ${String(err)}`);
      }
    }
  }
}

export function wireRollbackHandlers(): void {
  process.on("uncaughtException", (err) => {
    logger.error(`Uncaught exception: ${err.message}`);
    performRollback().finally(() => process.exit(1));
  });

  process.on("unhandledRejection", (reason) => {
    logger.error(`Unhandled rejection: ${String(reason)}`);
    performRollback().finally(() => process.exit(1));
  });

  process.on("SIGINT", () => {
    console.log(""); // newline after ^C
    logger.warn("Interrupted.");
    performRollback().finally(() => process.exit(130));
  });

  process.on("SIGTERM", () => {
    performRollback().finally(() => process.exit(143));
  });
}
