import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

/**
 * Vite config strategy (Option A):
 * Reads .four.json at Vite startup and conditionally registers plugins.
 * Installers drop files (globals.css, fragments) — they never edit this file.
 * New modules that need Vite plugins extend this conditional block.
 */
function loadFourPlugins(): Plugin[] {
  const statePath = join(process.cwd(), ".four.json");
  if (!existsSync(statePath)) return [];

  let modules: Record<string, unknown> = {};
  try {
    const raw = readFileSync(statePath, "utf8");
    const state = JSON.parse(raw) as { modules?: Record<string, unknown> };
    modules = state.modules ?? {};
  } catch {
    return [];
  }

  const plugins: Plugin[] = [];

  if (modules["tailwind"] === true) {
    // @tailwindcss/vite — Tailwind v4 Vite plugin (zero PostCSS config)
    const require = createRequire(import.meta.url);
    try {
      const tailwindVite = require("@tailwindcss/vite") as { default: () => Plugin };
      plugins.push(tailwindVite.default());
    } catch {
      // tailwind not installed — skip silently (installer adds the dep)
    }
  }

  return plugins;
}

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "~": new URL("./src", import.meta.url).pathname,
    },
  },
  plugins: [
    ...loadFourPlugins(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
  ],
});
