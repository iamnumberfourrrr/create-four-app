import { findFourJson } from "../core/state-finder.js";
import { readState, writeState } from "../core/state.js";
import { getInstaller, getInstallerNames } from "../core/registry.js";
import { dispatch } from "../core/dispatcher.js";
import { installDeps } from "../helpers/install-deps.js";
import { logger } from "../utils/logger.js";
import { basename } from "node:path";
import type { FourState } from "../core/state.js";
import type { Installer } from "../core/installer.js";

export interface AddOptions {
  skipInstall: boolean;
  force: boolean;
}

/**
 * Build a module-specific next-steps string after `add` completes.
 * Returns null if the module has no special guidance.
 */
function moduleNextSteps(moduleName: string): string | null {
  const steps: Record<string, string> = {
    db: "Run `pnpm db:push` to apply schema migrations.",
    auth: "Run `pnpm db:push && pnpm db:seed` then configure auth env vars in .env.",
    docker: "Run `docker compose up -d` to start dev services.",
    wrangler: "Run `pnpm wrangler login` then `pnpm cf:hyperdrive` to wire Cloudflare DB.",
    ci: "Commit the generated workflow file to enable GitHub Actions CI.",
    tailwind: "Tailwind v4 is now active. Import globals.css via the styles barrel.",
    shadcn: "shadcn/ui components are available in apps/web/src/components/ui/.",
    i18n: "Edit apps/web/src/i18n/locales/en.json to add your translations.",
    zustand: "Replace apps/web/src/stores/example.store.ts with your own stores.",
    worker: "Configure apps/worker/src/index.ts with your job handlers.",
  };
  return steps[moduleName] ?? null;
}

/**
 * Determine the module key that the given installer uses to guard itself in ctx.modules.
 * Most installers gate on a simple boolean flag keyed by their name.
 * The db and worker installers use a value field ("postgres"|"sqlite"|false etc.).
 */
function buildModulePatch(
  moduleName: string,
  config: unknown,
): FourState["modules"] {
  // For auth, the config is the providers array
  if (moduleName === "auth") {
    return { auth: Array.isArray(config) ? (config as string[]) : [] };
  }
  // For db-specific sub-installers, map back to db field
  if (moduleName === "db-postgres") return { db: "postgres" };
  if (moduleName === "db-sqlite") return { db: "sqlite" };
  // For worker sub-installers
  if (moduleName === "worker-pgboss") return { worker: "pgboss" };
  if (moduleName === "worker-sqlite-poll") return { worker: "sqlite-poll" };
  // Generic boolean modules
  return { [moduleName]: true } as FourState["modules"];
}

/**
 * Check whether a module is already recorded in state.
 * Handles db/worker/auth/boolean variants.
 */
function isAlreadyInstalled(moduleName: string, state: FourState): boolean {
  const mods = state.modules as Record<string, unknown>;

  if (moduleName === "auth") {
    const auth = mods["auth"];
    return Array.isArray(auth) && auth.length > 0;
  }
  if (moduleName === "db-postgres") return mods["db"] === "postgres";
  if (moduleName === "db-sqlite") return mods["db"] === "sqlite";
  if (moduleName === "worker-pgboss") return mods["worker"] === "pgboss";
  if (moduleName === "worker-sqlite-poll") return mods["worker"] === "sqlite-poll";

  return Boolean(mods[moduleName]);
}

/**
 * Check whether a required prereq is satisfied in state.
 * Maps installer.requires entries to the modules record.
 */
function prereqSatisfied(req: string, state: FourState): boolean {
  const mods = state.modules as Record<string, unknown>;

  // "db" prereq means any db is installed
  if (req === "db") {
    return mods["db"] !== false && mods["db"] !== undefined && mods["db"] !== null;
  }
  // "tailwind" prereq is a boolean flag
  return Boolean(mods[req]);
}

/**
 * Handler for `create-four-app add <module>`.
 *
 * Flow:
 *   1. Find .four.json by walking up from cwd (max 5 levels)
 *   2. Read + validate state
 *   3. Resolve installer from registry
 *   4. Guard: already installed (unless --force)
 *   5. Guard: missing prereqs
 *   6. Run installer.prompt() if present
 *   7. Dispatch FileOps
 *   8. pnpm install (unless --skip-install)
 *   9. Update .four.json
 *  10. Print next steps
 *
 * No auto-rollback — files written during a failed add stay; user reverts via git.
 */
export async function handleAdd(moduleName: string, options: AddOptions): Promise<void> {
  // 1. Find project root
  const projectDir = findFourJson(process.cwd());
  if (!projectDir) {
    logger.error(
      "No .four.json found. Run `create-four-app add` from inside a four-app project (walks up to 5 levels).",
    );
    process.exit(1);
  }

  // 2. Read state
  let state: FourState;
  try {
    state = await readState(projectDir);
  } catch (err) {
    logger.error(`Failed to read .four.json: ${String(err)}`);
    process.exit(1);
  }

  // 3. Resolve installer
  const installer = getInstaller(moduleName);
  if (!installer) {
    const known = getInstallerNames().join(", ");
    logger.error(
      `Unknown module "${moduleName}". Available modules: ${known}`,
    );
    process.exit(1);
  }

  // 4. Already installed guard
  if (!options.force && isAlreadyInstalled(moduleName, state)) {
    logger.error(
      `Module "${moduleName}" is already installed. Use --force to overwrite.`,
    );
    process.exit(1);
  }

  // 5. Prereqs check
  const missing = (installer.requires ?? []).filter((req) => !prereqSatisfied(req, state));
  if (missing.length > 0) {
    logger.error(
      `Module "${moduleName}" requires: ${missing.join(", ")}. Install them first with \`create-four-app add <module>\`.`,
    );
    process.exit(1);
  }

  // Build context — set modules from state so installers can read current selections,
  // and override the target module's key so the installer activates its guard.
  const patch = buildModulePatch(moduleName, null);
  const ctx = {
    projectDir,
    // Use the directory name as project name — matches what init used when creating the dir.
    projectName: basename(projectDir),
    framework: state.framework,
    modules: { ...state.modules, ...patch } as Record<string, unknown>,
    isAdd: true,
    notes: [] as string[],
  };

  // 6. Run prompt if installer defines one
  let config: unknown = null;
  if (installer.prompt) {
    config = await installer.prompt(ctx);
    // Re-patch modules with actual prompt result (e.g. auth providers array)
    const finalPatch = buildModulePatch(moduleName, config);
    ctx.modules = { ...ctx.modules, ...finalPatch } as Record<string, unknown>;
  }

  // 7. Dispatch FileOps for the target module, then re-run readme installer
  //    so README.md reflects the updated module state.
  logger.info(`Adding module: ${moduleName}`);
  const configs = new Map<string, unknown>();
  configs.set(moduleName, config);

  const installersToRun: Installer[] = [installer];
  const readmeInstaller = getInstaller("readme");
  const isReadmeRun = moduleName !== "readme" && readmeInstaller !== undefined;
  if (isReadmeRun && readmeInstaller) {
    installersToRun.push(readmeInstaller);
  }

  try {
    await dispatch(installersToRun, ctx, configs);
  } catch (err) {
    // No auto-rollback for add. Partial writes stay; user reverts via git.
    logger.error(`Add failed: ${String(err)}`);
    logger.warn("Partial files may have been written. Use `git checkout .` to revert.");
    process.exit(1);
  }

  // 8. Install deps
  await installDeps(projectDir, options.skipInstall);

  // 9. Update .four.json
  const finalPatch = buildModulePatch(moduleName, config);
  const updatedState: FourState = {
    ...state,
    modules: { ...state.modules, ...finalPatch },
  };
  try {
    await writeState(projectDir, updatedState);
    logger.success(`Updated .four.json — module "${moduleName}" recorded.`);
  } catch (err) {
    logger.error(`Failed to update .four.json: ${String(err)}`);
    process.exit(1);
  }

  // 10. Next steps
  const steps = moduleNextSteps(moduleName);
  if (steps) {
    logger.info(`Next: ${steps}`);
  }

  if (ctx.notes.length > 0) {
    for (const note of ctx.notes) {
      logger.warn(note);
    }
  }

  logger.success(`Done! Module "${moduleName}" added successfully.`);
}
