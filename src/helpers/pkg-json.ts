/**
 * Deep-merge package.json fragments.
 * Arrays are de-duplicated (union). Objects are recursively merged.
 * Scalar values in patch overwrite target.
 */
export function mergePkgJson(
  target: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const [key, val] of Object.entries(patch)) {
    const existing = result[key];

    if (Array.isArray(val) && Array.isArray(existing)) {
      // Union merge for arrays
      const combined = [...existing, ...val];
      result[key] = [...new Set(combined)];
      continue;
    }

    if (
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      existing !== null &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      result[key] = mergePkgJson(
        existing as Record<string, unknown>,
        val as Record<string, unknown>,
      );
      continue;
    }

    result[key] = val;
  }

  return result;
}

/**
 * Sort dependencies / devDependencies alphabetically (cosmetic, but consistent).
 */
export function sortDeps(pkg: Record<string, unknown>): Record<string, unknown> {
  const depKeys = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  const result = { ...pkg };
  for (const key of depKeys) {
    const deps = result[key];
    if (deps !== null && typeof deps === "object" && !Array.isArray(deps)) {
      const sorted = Object.fromEntries(
        Object.entries(deps as Record<string, string>).sort(([a], [b]) => a.localeCompare(b)),
      );
      result[key] = sorted;
    }
  }
  return result;
}
