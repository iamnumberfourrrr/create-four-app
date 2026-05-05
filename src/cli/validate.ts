import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// npm package name rules: lowercase, no uppercase, no spaces, starts with letter or @
const NPM_NAME_RE = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const KEBAB_ONLY_RE = /^[a-z][a-z0-9-]*$/;
const RESERVED_WORDS = new Set([
  "node_modules",
  "test",
  "tests",
  "src",
  "dist",
  "build",
  "public",
  "static",
  "assets",
]);

export interface ValidationError {
  message: string;
}

export function validateProjectName(name: string): ValidationError | null {
  if (!name || name.trim() === "") {
    return { message: "Project name cannot be empty." };
  }
  if (name !== name.toLowerCase()) {
    return { message: "Project name must be lowercase (no uppercase letters)." };
  }
  if (name.startsWith(".")) {
    return { message: "Project name cannot start with a dot." };
  }
  if (name.startsWith("_")) {
    return { message: "Project name cannot start with an underscore." };
  }
  if (!KEBAB_ONLY_RE.test(name)) {
    return {
      message:
        "Project name must be kebab-case: lowercase letters, numbers, and hyphens only, starting with a letter.",
    };
  }
  if (!NPM_NAME_RE.test(name)) {
    return { message: `"${name}" is not a valid npm package name.` };
  }
  if (RESERVED_WORDS.has(name)) {
    return {
      message: `"${name}" is a reserved word and cannot be used as a project name.`,
    };
  }
  if (name.length > 214) {
    return { message: "Project name must be 214 characters or fewer." };
  }
  return null;
}

export function validateProjectDir(
  name: string,
  cwd: string,
  force: boolean,
  inExisting: boolean,
): ValidationError | null {
  const dir = resolve(cwd, name);
  if (!existsSync(dir)) return null;

  if (inExisting) return null;

  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return { message: `Cannot read directory: ${dir}` };
  }

  if (entries.length === 0) return null;

  if (force) return null;

  return {
    message: `Directory "${name}" already exists and is not empty. Use --force to overwrite or --in-existing to scaffold into it.`,
  };
}
