import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { render } from "../utils/mustache.js";

/**
 * File extensions that are safe to read/write as UTF-8 text and run through
 * Mustache rendering. Everything else is copied as a raw Buffer to avoid
 * corrupting binary assets (images, fonts, archives, etc.).
 */
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".jsonc",
  ".md",
  ".yml",
  ".yaml",
  ".toml",
  ".env",
  ".gitignore",
  ".dockerignore",
  ".html",
  ".css",
  ".scss",
  ".txt",
  ".mustache",
]);

/**
 * Recursively copy a template directory into dest.
 *
 * - Text files (see TEXT_EXTENSIONS): mustache-rendered then written as UTF-8.
 * - Files ending in `.mustache`: suffix is stripped on output
 *   (e.g. `tsconfig.json.mustache` → `tsconfig.json`).
 * - Binary files: copied as raw Buffers, no rendering.
 * - File/directory names containing `{{name}}` are rendered via mustache.
 */
export async function copyTemplate(
  src: string,
  dest: string,
  vars: Record<string, unknown>,
): Promise<void> {
  await copyDir(src, dest, vars);
}

async function copyDir(src: string, dest: string, vars: Record<string, unknown>): Promise<void> {
  let dirents: import("node:fs").Dirent[];
  try {
    dirents = await readdir(src, { withFileTypes: true });
  } catch {
    // template dir may not exist yet — skip silently
    return;
  }

  for (const dirent of dirents) {
    const srcPath = join(src, dirent.name);
    // Render mustache tokens in the name itself, then strip .mustache suffix
    const renderedName = stripMustacheSuffix(render(dirent.name, vars));
    const destPath = join(dest, renderedName);

    if (dirent.isDirectory()) {
      await mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath, vars);
    } else {
      await mkdir(dest, { recursive: true });
      await copyFile(srcPath, destPath, dirent.name, vars);
    }
  }
}

async function copyFile(
  srcPath: string,
  destPath: string,
  originalName: string,
  vars: Record<string, unknown>,
): Promise<void> {
  if (isTextFile(originalName)) {
    const raw = await readFile(srcPath, "utf8");
    const rendered = render(raw, vars);
    await writeFile(destPath, rendered, "utf8");
  } else {
    const buf = await readFile(srcPath);
    await writeFile(destPath, buf);
  }
}

/**
 * Returns true when the file should be treated as UTF-8 text.
 * A `.mustache` file is always text; for compound extensions like
 * `tsconfig.json.mustache` we check the penultimate extension too.
 */
function isTextFile(name: string): boolean {
  const ext = extname(name).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  // Handle compound extensions: strip .mustache and check underlying ext
  if (ext === ".mustache") {
    const inner = extname(basename(name, ".mustache")).toLowerCase();
    return inner === "" || TEXT_EXTENSIONS.has(inner);
  }
  return false;
}

/** Strip trailing `.mustache` suffix from a file name. */
function stripMustacheSuffix(name: string): string {
  return name.endsWith(".mustache") ? name.slice(0, -".mustache".length) : name;
}

export function templateVars(projectName: string): Record<string, unknown> {
  return { name: projectName, projectName };
}
