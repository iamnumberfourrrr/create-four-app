import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { x } from "tinyexec";
import type { NonInteractiveConfig } from "../../src/cli/non-interactive.js";

/** Absolute path to the built CLI entry point. */
const CLI_BIN = join(import.meta.dirname, "..", "..", "dist", "index.js");

export interface ScaffoldResult {
  dir: string;
  cleanup: () => Promise<void>;
}

/**
 * Invoke the CLI in non-interactive mode inside a fresh tmpdir.
 *
 * The caller is responsible for calling `cleanup()` after assertions.
 * Tests should call cleanup in an `afterEach` or `finally` block.
 *
 * @param config - JSON config matching NonInteractiveConfig shape
 * @returns { dir, cleanup } — dir is the scaffolded project directory
 */
export async function scaffoldProject(config: NonInteractiveConfig): Promise<ScaffoldResult> {
  // Create a temp workspace dir (not the project dir itself)
  const workspaceDir = await mkdtemp(join(tmpdir(), "four-test-"));

  // Write the JSON config to a temp file inside workspace
  const configPath = join(workspaceDir, "test-config.json");
  await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");

  // Invoke CLI: creates <workspaceDir>/<projectName>/
  const result = await x(
    "node",
    [CLI_BIN, "--non-interactive", "--json-config", configPath, "--skip-install", "--no-rollback"],
    { nodeOptions: { cwd: workspaceDir } },
  );

  if (result.exitCode !== 0) {
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    // Clean up before throwing
    await rm(workspaceDir, { recursive: true, force: true });
    throw new Error(
      `CLI scaffolding failed (exit ${result.exitCode}):\n${stdout}\n${stderr}`.trim(),
    );
  }

  const projectDir = join(workspaceDir, config.projectName);

  return {
    dir: projectDir,
    cleanup: () => rm(workspaceDir, { recursive: true, force: true }),
  };
}

/**
 * Run `create-four-app add <module>` inside an existing project dir.
 * Assumes the CLI is already built.
 */
export async function addModule(projectDir: string, moduleName: string): Promise<void> {
  const result = await x(
    "node",
    [CLI_BIN, "add", moduleName, "--skip-install"],
    { nodeOptions: { cwd: projectDir } },
  );

  if (result.exitCode !== 0) {
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    throw new Error(
      `\`add ${moduleName}\` failed (exit ${result.exitCode}):\n${stdout}\n${stderr}`.trim(),
    );
  }
}
