import { readFile } from "node:fs/promises";
import { validateProjectName } from "./validate.js";
import type { WizardAnswers } from "./prompts.js";
import type { FourState } from "../core/state.js";

/**
 * Shape of the JSON config file consumed by --non-interactive mode.
 *
 * All module fields are optional and default to false/off when absent.
 * The "framework" field is required.
 */
export interface NonInteractiveConfig {
  projectName: string;
  framework: "tanstack-start" | "tanstack-router";
  modules?: {
    tailwind?: boolean;
    shadcn?: boolean;
    i18n?: boolean;
    zustand?: boolean;
    tanstack?: {
      query?: boolean;
      form?: boolean;
      table?: boolean;
      virtual?: boolean;
      store?: boolean;
      db?: boolean;
      pacer?: boolean;
      ranger?: boolean;
    };
    db?: "postgres" | "sqlite" | false;
    worker?: "pgboss" | "sqlite-poll" | false;
    auth?: string[];
    docker?: boolean;
    wrangler?: boolean;
    ci?: boolean;
  };
}

const VALID_FRAMEWORKS = new Set<string>(["tanstack-start", "tanstack-router"]);
const VALID_DB = new Set<string>(["postgres", "sqlite"]);
const VALID_WORKER = new Set<string>(["pgboss", "sqlite-poll"]);
const VALID_AUTH_PROVIDERS = new Set<string>([
  "email-password",
  "github",
  "google",
  "discord",
  "passkeys",
]);

function isStringRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Validate and parse a non-interactive JSON config.
 * Throws with a descriptive message on any validation error.
 */
function validateConfig(raw: unknown): NonInteractiveConfig {
  if (!isStringRecord(raw)) {
    throw new Error("JSON config must be an object");
  }

  // projectName
  if (typeof raw["projectName"] !== "string") {
    throw new Error("JSON config: 'projectName' must be a string");
  }
  const nameErr = validateProjectName(raw["projectName"]);
  if (nameErr) {
    throw new Error(`JSON config: invalid projectName — ${nameErr.message}`);
  }

  // framework
  if (typeof raw["framework"] !== "string" || !VALID_FRAMEWORKS.has(raw["framework"])) {
    throw new Error(
      `JSON config: 'framework' must be one of: ${[...VALID_FRAMEWORKS].join(", ")}`,
    );
  }

  const mods = raw["modules"];
  if (mods !== undefined && !isStringRecord(mods)) {
    throw new Error("JSON config: 'modules' must be an object");
  }

  if (isStringRecord(mods)) {
    // db
    if (
      mods["db"] !== undefined &&
      mods["db"] !== false &&
      !VALID_DB.has(mods["db"] as string)
    ) {
      throw new Error(
        `JSON config: 'modules.db' must be false or one of: ${[...VALID_DB].join(", ")}`,
      );
    }

    // worker
    if (
      mods["worker"] !== undefined &&
      mods["worker"] !== false &&
      !VALID_WORKER.has(mods["worker"] as string)
    ) {
      throw new Error(
        `JSON config: 'modules.worker' must be false or one of: ${[...VALID_WORKER].join(", ")}`,
      );
    }

    // auth providers
    if (mods["auth"] !== undefined) {
      if (!Array.isArray(mods["auth"])) {
        throw new Error("JSON config: 'modules.auth' must be an array of provider strings");
      }
      const invalid = (mods["auth"] as unknown[]).filter(
        (p) => typeof p !== "string" || !VALID_AUTH_PROVIDERS.has(p),
      );
      if (invalid.length > 0) {
        throw new Error(
          `JSON config: invalid auth providers: ${invalid.join(", ")}. Valid: ${[...VALID_AUTH_PROVIDERS].join(", ")}`,
        );
      }
    }

    // shadcn requires tailwind
    if (mods["shadcn"] === true && !mods["tailwind"]) {
      throw new Error("JSON config: 'modules.shadcn' requires 'modules.tailwind' to be true");
    }
  }

  // Reconstruct as typed object — all fields validated above
  const projectName = raw["projectName"] as string;
  const framework = raw["framework"] as "tanstack-start" | "tanstack-router";
  const modules = isStringRecord(raw["modules"])
    ? (raw["modules"] as NonInteractiveConfig["modules"])
    : undefined;

  const result: NonInteractiveConfig = { projectName, framework };
  if (modules !== undefined) {
    result.modules = modules;
  }
  return result;
}

/**
 * Read and validate a JSON config file from disk.
 * Throws on file read failure or validation error.
 */
export async function readNonInteractiveConfig(configPath: string): Promise<NonInteractiveConfig> {
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch (err) {
    throw new Error(`Cannot read JSON config file "${configPath}": ${String(err)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`JSON config file "${configPath}" contains invalid JSON`);
  }

  return validateConfig(parsed);
}

/**
 * Convert a validated NonInteractiveConfig into WizardAnswers, applying the
 * same defaults and auto-inclusions as the interactive wizard.
 */
export function configToWizardAnswers(cfg: NonInteractiveConfig): WizardAnswers {
  const mods = cfg.modules ?? {};

  const tailwind = Boolean(mods.tailwind);
  const shadcn = tailwind ? Boolean(mods.shadcn) : false;
  const i18n = Boolean(mods.i18n);
  const zustand = Boolean(mods.zustand);
  const docker = Boolean(mods.docker);
  const wrangler = Boolean(mods.wrangler);
  const ci = Boolean(mods.ci);

  const db: "postgres" | "sqlite" | false =
    mods.db === "postgres" || mods.db === "sqlite" ? mods.db : false;

  const worker: "pgboss" | "sqlite-poll" | false =
    db !== false
      ? mods.worker === "pgboss" || mods.worker === "sqlite-poll"
        ? mods.worker
        : false
      : false;

  const auth: string[] =
    db !== false && cfg.framework === "tanstack-start"
      ? Array.isArray(mods.auth)
        ? (mods.auth as string[])
        : []
      : [];

  const tanstackCfg = mods.tanstack ?? {};
  // Auto-include query when Start framework (mirrors interactive wizard)
  const queryAuto = cfg.framework === "tanstack-start";

  const modules: FourState["modules"] = {
    tailwind,
    shadcn,
    i18n,
    zustand,
    tanstack: {
      query: queryAuto || Boolean(tanstackCfg.query),
      form: Boolean(tanstackCfg.form),
      table: Boolean(tanstackCfg.table),
      virtual: Boolean(tanstackCfg.virtual),
      store: Boolean(tanstackCfg.store),
      db: Boolean(tanstackCfg.db),
      pacer: Boolean(tanstackCfg.pacer),
      ranger: Boolean(tanstackCfg.ranger),
    },
    db,
    worker,
    auth,
    docker,
    wrangler,
    ci,
  };

  return {
    projectName: cfg.projectName,
    framework: cfg.framework,
    modules,
  };
}
