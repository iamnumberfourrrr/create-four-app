/// <reference types="vite/client" />
import { z } from "zod";

/**
 * Env composer: glob-loads all fragment schemas from ./fragments/*.ts
 * and merges them into a single parsed env object.
 *
 * This file is intended to be consumed by a Vite-bundled app (apps/web or apps/worker).
 * import.meta.glob is a Vite compile-time feature — do not run this file with Node directly.
 *
 * Phase 04+ drops fragment files into ./fragments/ — this file never changes.
 * When fragments dir is empty, returns {} (empty object).
 */

// Vite glob import of all fragment modules (compile-time, eager)
const fragmentModules = import.meta.glob("./fragments/*.ts", { eager: true });

type FragmentModule = { schema: z.ZodObject<z.ZodRawShape> };

function isFragmentModule(m: unknown): m is FragmentModule {
  return typeof m === "object" && m !== null && "schema" in m && m.schema instanceof z.ZodObject;
}

function buildSchema(): z.ZodObject<z.ZodRawShape> {
  let merged: z.ZodRawShape = {};

  for (const mod of Object.values(fragmentModules)) {
    if (isFragmentModule(mod)) {
      merged = { ...merged, ...mod.schema.shape };
    }
  }

  return z.object(merged);
}

const envSchema = buildSchema();

// Parse and validate import.meta.env against merged schema.
// Returns {} when no fragments are loaded.
export const env = envSchema.parse(
  typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {},
) as z.infer<typeof envSchema>;

export type Env = typeof env;
