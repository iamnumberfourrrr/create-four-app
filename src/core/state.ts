import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const STATE_FILE = ".four.json";

export interface FourState {
  version: string;
  framework: "tanstack-start" | "tanstack-router";
  modules: {
    tailwind?: boolean;
    shadcn?: boolean;
    i18n?: boolean;
    zustand?: boolean;
    tanstack?: {
      query: boolean;
      form: boolean;
      table: boolean;
      virtual: boolean;
      store: boolean;
      db: boolean;
      pacer: boolean;
      ranger: boolean;
    };
    db?: "postgres" | "sqlite" | false;
    worker?: "pgboss" | "sqlite-poll" | false;
    auth?: string[];
    docker?: boolean;
    wrangler?: boolean;
    ci?: boolean;
  };
}

const VALID_FRAMEWORKS = new Set(["tanstack-start", "tanstack-router"]);

function validateState(raw: unknown): FourState {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${STATE_FILE} must be a JSON object`);
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj["version"] !== "string") {
    throw new Error(`${STATE_FILE} missing required field: version`);
  }
  if (typeof obj["framework"] !== "string" || !VALID_FRAMEWORKS.has(obj["framework"])) {
    throw new Error(`${STATE_FILE} has invalid framework: ${String(obj["framework"])}`);
  }
  if (typeof obj["modules"] !== "object" || obj["modules"] === null) {
    throw new Error(`${STATE_FILE} missing required field: modules`);
  }
  return obj as unknown as FourState;
}

export async function readState(projectDir: string): Promise<FourState> {
  const statePath = join(projectDir, STATE_FILE);
  let raw: string;
  try {
    raw = await readFile(statePath, "utf8");
  } catch {
    throw new Error(`No ${STATE_FILE} found in ${projectDir}. Run create-four-app first.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${STATE_FILE} contains invalid JSON`);
  }
  return validateState(parsed);
}

export async function writeState(projectDir: string, state: FourState): Promise<void> {
  const statePath = join(projectDir, STATE_FILE);
  await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

export function makeInitialState(
  framework: "tanstack-start" | "tanstack-router",
  modules: FourState["modules"],
): FourState {
  return {
    version: "0.1.0",
    framework,
    modules,
  };
}
