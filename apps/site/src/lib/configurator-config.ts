import type {
  AuthProvider,
  DbVariant,
  OpsModuleKey,
  SimpleModuleKey,
  WorkerVariant,
} from "./modules";

export interface Config {
  projectName: string;
  framework: "tanstack-start" | "tanstack-router";
  modules: {
    tailwind: boolean;
    shadcn: boolean;
    i18n: boolean;
    zustand: boolean;
    "tanstack-extras": boolean;
    db: DbVariant;
    worker: WorkerVariant;
    auth: AuthProvider[];
    docker: boolean;
    wrangler: boolean;
    ci: boolean;
  };
}

export const INITIAL_CONFIG: Config = {
  projectName: "my-app",
  framework: "tanstack-start",
  modules: {
    tailwind: false,
    shadcn: false,
    i18n: false,
    zustand: false,
    "tanstack-extras": false,
    db: "none",
    worker: "none",
    auth: [],
    docker: false,
    wrangler: false,
    ci: false,
  },
};

// Apply prerequisite rules. Always called after any state change.
export function normalize(config: Config): Config {
  const m = { ...config.modules };

  if (m.shadcn) m.tailwind = true;
  if (m.worker !== "none" && m.db === "none") m.db = "postgres";
  if (m.auth.length > 0 && m.db === "none") m.db = "postgres";
  if (m.wrangler && m.db === "sqlite") m.db = "postgres";

  const framework = m.auth.length > 0 ? "tanstack-start" : config.framework;
  return { ...config, framework, modules: m };
}

// Serialize to the same shape the CLI's --json-config expects.
// Omit disabled modules so the JSON stays minimal.
export function toConfigJSON(config: Config): string {
  const modules: Record<string, unknown> = {};
  const m = config.modules;

  if (m.tailwind) modules.tailwind = true;
  if (m.shadcn) modules.shadcn = true;
  if (m.i18n) modules.i18n = true;
  if (m.zustand) modules.zustand = true;
  if (m["tanstack-extras"]) modules["tanstack-extras"] = true;
  if (m.db !== "none") modules.db = m.db;
  if (m.worker !== "none") modules.worker = m.worker;
  if (m.auth.length > 0) modules.auth = m.auth;
  if (m.docker) modules.docker = true;
  if (m.wrangler) modules.wrangler = true;
  if (m.ci) modules.ci = true;

  const out = {
    projectName: config.projectName,
    framework: config.framework,
    modules,
  };
  return JSON.stringify(out, null, 2);
}

export function toRunCommand(projectName: string): string {
  const safe = projectName.trim() || "my-app";
  return `create-four-app ${safe} --non-interactive --json-config config.json`;
}

export type SimpleKey = SimpleModuleKey;
export type OpsKey = OpsModuleKey;
