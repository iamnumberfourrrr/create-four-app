import { x } from "tinyexec";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { logger } from "../utils/logger.js";

type PackageManager = "pnpm" | "npm" | "yarn";

/**
 * Detect which package manager to use, defaulting to pnpm.
 */
export function detectPackageManager(): PackageManager {
  // Prefer pnpm for this CLI's intended stack
  const userAgent = process.env["npm_config_user_agent"] ?? "";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("npm")) return "npm";
  return "pnpm";
}

/**
 * Run the package manager install command in the project directory.
 * Skips entirely when skipInstall is true.
 */
export async function installDeps(projectDir: string, skipInstall: boolean): Promise<void> {
  if (skipInstall) {
    logger.dim("Skipping dependency installation (--skip-install).");
    return;
  }

  const hasPkgJson = existsSync(join(projectDir, "package.json"));
  if (!hasPkgJson) {
    logger.dim("No package.json found — skipping install.");
    return;
  }

  const pm = detectPackageManager();
  logger.step(`Installing dependencies with ${pm}...`);

  try {
    await x(pm, ["install"], {
      nodeOptions: { cwd: projectDir },
    });
    logger.success("Dependencies installed.");
  } catch (err) {
    throw new Error(`Failed to install dependencies: ${String(err)}`);
  }
}
