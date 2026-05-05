import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { STATE_FILE } from "./state.js";

/** Maximum number of directory levels to walk up when searching for .four.json. */
const MAX_WALK_LEVELS = 5;

/**
 * Walk up from `startDir` looking for a `.four.json` file, up to MAX_WALK_LEVELS.
 * Returns the directory containing `.four.json`, or null if not found.
 */
export function findFourJson(startDir: string): string | null {
  let current = startDir;

  for (let level = 0; level <= MAX_WALK_LEVELS; level++) {
    const candidate = join(current, STATE_FILE);
    if (existsSync(candidate)) {
      return current;
    }
    const parent = dirname(current);
    // Stop when we've hit the filesystem root
    if (parent === current) {
      return null;
    }
    current = parent;
  }

  return null;
}
