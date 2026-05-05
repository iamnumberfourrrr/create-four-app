import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

/** Default directories/files to exclude from comparison. */
const DEFAULT_IGNORE = new Set([
  "node_modules",
  ".git",
  "pnpm-lock.yaml",
  ".four.json",
]);

export interface TreeDiffOptions {
  /** Additional file/dir names to ignore (exact name match, not path). */
  ignore?: string[];
}

export interface DiffEntry {
  path: string;
  reason: "only-in-a" | "only-in-b" | "content-mismatch";
}

/**
 * Recursively list all files under `dir`, returning paths relative to `dir`.
 * Skips any entry whose name matches the ignore set.
 */
async function listFiles(dir: string, ignore: Set<string>): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (ignore.has(entry.name)) continue;

      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        results.push(relative(dir, fullPath));
      }
    }
  }

  await walk(dir);
  return results.sort();
}

/**
 * Compare two directory trees byte-for-byte.
 *
 * Returns a list of differences. An empty array means the trees are identical
 * (modulo the ignored entries).
 *
 * `.four.json` is always excluded from the file diff — use `normalizeFourJson`
 * to compare state files separately.
 */
export async function treeDiff(
  dirA: string,
  dirB: string,
  options: TreeDiffOptions = {},
): Promise<DiffEntry[]> {
  const ignoreSet = new Set([
    ...DEFAULT_IGNORE,
    ...(options.ignore ?? []),
  ]);

  const [filesA, filesB] = await Promise.all([
    listFiles(dirA, ignoreSet),
    listFiles(dirB, ignoreSet),
  ]);

  const setA = new Set(filesA);
  const setB = new Set(filesB);
  const diffs: DiffEntry[] = [];

  // Files only in A
  for (const f of filesA) {
    if (!setB.has(f)) {
      diffs.push({ path: f, reason: "only-in-a" });
    }
  }

  // Files only in B
  for (const f of filesB) {
    if (!setA.has(f)) {
      diffs.push({ path: f, reason: "only-in-b" });
    }
  }

  // Files in both — byte compare
  const shared = filesA.filter((f) => setB.has(f));
  await Promise.all(
    shared.map(async (f) => {
      const [bufA, bufB] = await Promise.all([
        readFile(join(dirA, f)),
        readFile(join(dirB, f)),
      ]);
      if (!bufA.equals(bufB)) {
        diffs.push({ path: f, reason: "content-mismatch" });
      }
    }),
  );

  // Sort for deterministic output
  diffs.sort((a, b) => a.path.localeCompare(b.path));
  return diffs;
}

/**
 * Read and normalise `.four.json` from a directory for comparison.
 * Normalisation: parse JSON, sort keys recursively, re-stringify.
 * This eliminates insertion-order differences between init and add flows.
 */
export async function normalizeFourJson(dir: string): Promise<string> {
  let raw: string;
  try {
    raw = await readFile(join(dir, ".four.json"), "utf8");
  } catch {
    return "";
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw;
  }

  return JSON.stringify(sortKeysDeep(parsed), null, 2) + "\n";
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(obj)
        .sort()
        .map((k) => [k, sortKeysDeep(obj[k])]),
    );
  }
  return value;
}
