import { cac } from "cac";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { runWizard } from "./cli/prompts.js";
import { readNonInteractiveConfig, configToWizardAnswers } from "./cli/non-interactive.js";
import { parseGlobalFlags, FLAG_DESCRIPTIONS } from "./cli/flags.js";
import { validateProjectDir } from "./cli/validate.js";
import { wireRollbackHandlers, configureRollback, disableRollback } from "./core/rollback.js";
import { dispatch } from "./core/dispatcher.js";
import { getAllInstallers } from "./core/registry.js";
import { makeInitialState, writeState } from "./core/state.js";
import { installDeps } from "./helpers/install-deps.js";
import { gitInit } from "./helpers/git.js";
import { logger } from "./utils/logger.js";
import { printPostScaffold } from "./cli/post-scaffold.js";
import { handleAdd } from "./cli/add-handler.js";
// Register all installers into the registry (order = execution order)
import "./installers/index.js";

const cli = cac("create-four-app");
cli.version("0.1.0");
cli.help();

// ── init (default command) ────────────────────────────────────────────────────
cli
  .command("[name]", "Scaffold a new four-app monorepo")
  .option("--skip-install", FLAG_DESCRIPTIONS.skipInstall)
  .option("--no-rollback", FLAG_DESCRIPTIONS.noRollback)
  .option("--force", FLAG_DESCRIPTIONS.force)
  .option("--in-existing", FLAG_DESCRIPTIONS.inExisting)
  .option("--non-interactive", "Skip prompts (requires --json-config)")
  .option("--json-config <path>", "Path to JSON config file for non-interactive mode")
  .action(async (name: string | undefined, options: Record<string, unknown>) => {
    const flags = parseGlobalFlags(options);
    const nonInteractive = Boolean(options["non-interactive"] ?? options["nonInteractive"]);
    const jsonConfigPath =
      typeof options["json-config"] === "string"
        ? options["json-config"]
        : typeof options["jsonConfig"] === "string"
          ? options["jsonConfig"]
          : undefined;

    wireRollbackHandlers();

    // Determine wizard answers — either from JSON config or interactive wizard
    let answers: Awaited<ReturnType<typeof runWizard>>;
    if (nonInteractive) {
      if (!jsonConfigPath) {
        logger.error("--non-interactive requires --json-config <path>");
        process.exit(1);
      }
      let cfg: Awaited<ReturnType<typeof readNonInteractiveConfig>>;
      try {
        cfg = await readNonInteractiveConfig(jsonConfigPath);
      } catch (err) {
        logger.error(String(err));
        process.exit(1);
      }
      answers = configToWizardAnswers(cfg);
    } else {
      // Run wizard (validates name inline if passed as arg)
      answers = await runWizard(name);
    }

    // Post-wizard validation of directory
    const dirErr = validateProjectDir(
      answers.projectName,
      process.cwd(),
      flags.force,
      flags.inExisting,
    );
    if (dirErr) {
      logger.error(dirErr.message);
      process.exit(1);
    }

    const projectDir = resolve(process.cwd(), answers.projectName);

    configureRollback({
      projectDir,
      noRollback: flags.noRollback,
      inExisting: flags.inExisting,
    });

    // Create project dir
    if (!existsSync(projectDir)) {
      await mkdir(projectDir, { recursive: true });
    }

    // Build context
    const ctx = {
      projectDir,
      projectName: answers.projectName,
      framework: answers.framework,
      modules: answers.modules as Record<string, unknown>,
      isAdd: false,
      notes: [] as string[],
    };

    // Run installers — collect sub-configs from prompt() before dispatching
    const installers = getAllInstallers();
    const configs = new Map<string, unknown>();

    for (const installer of installers) {
      if (installer.prompt) {
        const result = await installer.prompt(ctx);
        configs.set(installer.name, result);
      }
    }

    await dispatch(installers, ctx, configs);

    // Write state file
    const state = makeInitialState(answers.framework, answers.modules);
    await writeState(projectDir, state);
    logger.success(`Written .four.json`);

    // Git init
    await gitInit(projectDir);

    // Install deps (runs before post-scaffold tree so node_modules exist but are ignored)
    await installDeps(projectDir, flags.skipInstall);

    disableRollback();

    // Rich post-scaffold output: tree + next-steps + notes + URL
    printPostScaffold(ctx, projectDir);
  });

// ── add subcommand ────────────────────────────────────────────────────────────
cli
  .command("add <module>", "Add a module to an existing four-app project")
  .option("--skip-install", FLAG_DESCRIPTIONS.skipInstall)
  .option("--force", FLAG_DESCRIPTIONS.force)
  .action(async (module: string, options: Record<string, unknown>) => {
    const flags = parseGlobalFlags(options);
    await handleAdd(module, {
      skipInstall: flags.skipInstall,
      force: flags.force,
    });
  });

try {
  cli.parse();
} catch (err) {
  if (err instanceof Error && err.message.includes("missing required args")) {
    logger.error(err.message);
    cli.outputHelp();
  } else {
    throw err;
  }
}
