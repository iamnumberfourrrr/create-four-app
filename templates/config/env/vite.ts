/// <reference types="vite/client" />
import { composeEnv } from "./index.js";

/**
 * Vite-only env entry. Use from a Vite-bundled consumer:
 *
 *   import { env } from "@<scope>/config/env/vite";
 *
 * `import.meta.glob` and `import.meta.env` are Vite compile-time features.
 * Importing this file from a non-Vite tool (tsx, plain esbuild, vitest
 * non-browser) yields an empty env at runtime, plus an esbuild warning
 * about `import.meta` in CJS — both expected, both safe to ignore in
 * non-Vite contexts.
 */

const fragmentModules = import.meta.glob("./fragments/*.ts", { eager: true });

export const env = composeEnv(fragmentModules, import.meta.env);
export type Env = typeof env;
