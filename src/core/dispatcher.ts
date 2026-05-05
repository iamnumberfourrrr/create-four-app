import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { dirname, join, resolve, relative } from "node:path";
import type { FileOp, InstallerContext, Installer } from "./installer.js";
import { mergeYaml } from "../helpers/yaml-merge.js";
import { logger } from "../utils/logger.js";

function safeResolvePath(projectDir: string, filePath: string): string {
  const base = resolve(projectDir);
  const full = resolve(join(projectDir, filePath));
  const rel = relative(base, full);
  if (rel.startsWith("..") || rel === "") {
    throw new Error(`Path traversal rejected: ${filePath}`);
  }
  return full;
}

async function deepMerge(
  target: Record<string, unknown>,
  patch: object,
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = { ...target };
  for (const [key, val] of Object.entries(patch)) {
    if (
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = await deepMerge(
        result[key] as Record<string, unknown>,
        val as Record<string, unknown>,
      );
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Sort dependency block keys alphabetically in-place for a merged package.json
 * object. This ensures that `init-with-module` and `init-base + add module`
 * produce byte-identical package.json files regardless of installer run order.
 *
 * Only sorts the well-known dep blocks: dependencies, devDependencies,
 * peerDependencies, optionalDependencies.
 */
function normalizePkgJsonDeps(obj: Record<string, unknown>): void {
  const DEP_KEYS = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ] as const;

  for (const key of DEP_KEYS) {
    const block = obj[key];
    if (block !== null && typeof block === "object" && !Array.isArray(block)) {
      const sorted = Object.fromEntries(
        Object.entries(block as Record<string, unknown>).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      );
      obj[key] = sorted;
    }
  }
}

async function applyOp(op: FileOp, projectDir: string): Promise<void> {
  if (op.kind === "mkdir") {
    const full = safeResolvePath(projectDir, op.path);
    await mkdir(full, { recursive: true });
    return;
  }

  const full = safeResolvePath(projectDir, op.path);
  await mkdir(dirname(full), { recursive: true });

  if (op.kind === "write") {
    try {
      await readFile(full, "utf8");
      if (!op.overwrite) {
        logger.dim(`  skip (exists): ${op.path}`);
        return;
      }
    } catch {
      // file does not exist — proceed
    }
    await writeFile(full, op.content, "utf8");
    logger.dim(`  write: ${op.path}`);
    return;
  }

  if (op.kind === "merge-json") {
    let existing: Record<string, unknown> = {};
    try {
      const raw = await readFile(full, "utf8");
      existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // file absent or invalid — start fresh
    }
    const merged = await deepMerge(existing, op.patch);
    // Normalize package.json dependency block key order so init and add produce
    // identical output regardless of installer execution order.
    normalizePkgJsonDeps(merged);
    await writeFile(full, JSON.stringify(merged, null, 2) + "\n", "utf8");
    logger.dim(`  merge-json: ${op.path}`);
    return;
  }

  if (op.kind === "merge-yaml") {
    let existing = "";
    try {
      existing = await readFile(full, "utf8");
    } catch {
      // file absent — mergeYaml treats empty string as {}
    }
    const updated = mergeYaml(existing, op.patch as Record<string, unknown>);
    await writeFile(full, updated, "utf8");
    logger.dim(`  merge-yaml: ${op.path}`);
    return;
  }

  if (op.kind === "append") {
    await appendFile(full, op.content, "utf8");
    logger.dim(`  append: ${op.path}`);
    return;
  }
}

export async function dispatch(
  installers: Installer[],
  ctx: InstallerContext,
  configs: Map<string, unknown>,
): Promise<void> {
  for (const installer of installers) {
    logger.step(`Running installer: ${installer.name}`);
    const config = configs.get(installer.name) ?? null;
    let ops: FileOp[];
    try {
      ops = await Promise.resolve(installer.install(ctx, config));
    } catch (err) {
      throw new Error(`Installer "${installer.name}" failed: ${String(err)}`);
    }
    for (const op of ops) {
      await applyOp(op, ctx.projectDir);
    }
  }
}
