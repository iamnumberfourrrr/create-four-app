import { x } from "tinyexec";
import { logger } from "../utils/logger.js";

/**
 * Run `git init` in the given directory and create an initial commit.
 * Silently skips if git is not available.
 */
export async function gitInit(projectDir: string): Promise<void> {
  try {
    await x("git", ["init", "--initial-branch=master"], {
      nodeOptions: { cwd: projectDir },
    });
    await x("git", ["add", "-A"], { nodeOptions: { cwd: projectDir } });
    await x("git", ["commit", "-m", "chore: initial scaffold"], {
      nodeOptions: { cwd: projectDir },
    });
    logger.success("Git repository initialised (master branch).");
  } catch (err) {
    logger.warn(`Git init skipped: ${String(err)}`);
  }
}

/**
 * Check whether a git executable is available on PATH.
 */
export async function isGitAvailable(): Promise<boolean> {
  try {
    await x("git", ["--version"]);
    return true;
  } catch {
    return false;
  }
}
