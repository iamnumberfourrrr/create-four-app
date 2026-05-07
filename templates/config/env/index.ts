import { z } from "zod";

/**
 * Env composer (CJS-safe entry).
 *
 * This file intentionally avoids any `import.meta` reference so it can be
 * scanned by non-Vite tools (Vitest pre-bundle, tsx, esbuild) without
 * emitting the warning:
 *   "import.meta is not available with the cjs output format and will be empty"
 *
 * Vite-specific glob loading + import.meta.env access lives in `./vite.ts`,
 * which is only resolved by Vite-bundled consumers via `@<scope>/config/env/vite`.
 *
 * Phase 04+ drops fragment files into ./fragments/ and either re-exports them
 * from this file (CJS-safe) or wires the Vite-only entry depending on the
 * consumer.
 */

export type FragmentModule = { schema: z.ZodObject<z.ZodRawShape> };

export function isFragmentModule(m: unknown): m is FragmentModule {
  if (typeof m !== "object" || m === null || !("schema" in m)) return false;
  return m.schema instanceof z.ZodObject;
}

export function composeEnv(
  fragments: Record<string, unknown>,
  rawEnv: Record<string, unknown>,
): Record<string, unknown> {
  let merged: z.ZodRawShape = {};
  for (const mod of Object.values(fragments)) {
    if (isFragmentModule(mod)) {
      merged = { ...merged, ...mod.schema.shape };
    }
  }
  return z.object(merged).parse(rawEnv);
}

// Empty default export until Phase 04 wires real fragments via ./vite.ts.
export const env: Record<string, unknown> = {};
export type Env = typeof env;
