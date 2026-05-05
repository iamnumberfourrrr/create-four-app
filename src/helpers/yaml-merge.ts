import { parse, stringify } from "yaml";

/**
 * Deep-merge `patch` into the YAML `existing` string and return updated YAML.
 *
 * Rules:
 * - Missing or empty `existing` is treated as an empty object.
 * - Plain objects are recursively merged.
 * - Arrays are concatenated and deduplicated by value.
 * - All other values: patch wins.
 */
export function mergeYaml(existing: string, patch: Record<string, unknown>): string {
  let base: Record<string, unknown> = {};
  if (existing.trim() !== "") {
    const parsed = parse(existing);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      base = parsed as Record<string, unknown>;
    }
  }
  const merged = deepMerge(base, patch);
  return stringify(merged);
}

function deepMerge(
  target: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const [key, val] of Object.entries(patch)) {
    const existing = result[key];
    if (Array.isArray(val) && Array.isArray(existing)) {
      // Deduplicate by value (string-serialised for structural equality)
      const seen = new Set(existing.map((v) => JSON.stringify(v)));
      const additions = val.filter((v) => !seen.has(JSON.stringify(v)));
      result[key] = [...existing, ...additions];
    } else if (isPlainObject(val) && isPlainObject(existing)) {
      result[key] = deepMerge(existing as Record<string, unknown>, val as Record<string, unknown>);
    } else {
      result[key] = val;
    }
  }
  return result;
}

function isPlainObject(v: unknown): boolean {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// ── Legacy helpers kept for callers that used the old workspace-only API ──────

export interface WorkspaceYaml {
  packages: string[];
}

export function mergeWorkspaceYaml(existing: string, additions: string[]): string {
  return mergeYaml(existing, { packages: additions });
}

export function serializeWorkspaceYaml(workspace: WorkspaceYaml): string {
  return mergeWorkspaceYaml("", workspace.packages);
}
