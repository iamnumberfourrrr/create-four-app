import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * Tailwind v4 installer.
 *
 * Strategy: Option A (vite.config.ts reads .four.json at startup and conditionally
 * registers @tailwindcss/vite). The installer drops globals.css and adds deps only.
 * No edits to vite.config.ts ever — the template ships with the conditional block.
 *
 * globals.css is imported via a styles barrel (src/styles/index.ts) that the root
 * route imports unconditionally. The tailwind installer drops globals.css into that dir.
 */

const tailwindInstaller: Installer = {
  name: "tailwind",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    if (!modules["tailwind"]) return [];

    const webDir = join("apps", "web");

    return [
      // globals.css — Tailwind v4 syntax: @import "tailwindcss" (no @tailwind directives)
      {
        kind: "write",
        path: join(webDir, "src", "styles", "globals.css"),
        content: `@import "tailwindcss";\n`,
      },
      // styles barrel — overwrites the no-op from the web template; root route imports unconditionally
      {
        kind: "write",
        path: join(webDir, "src", "styles", "index.ts"),
        content: `// Styles barrel — imported by root route unconditionally.\nimport "./globals.css";\n`,
        overwrite: true,
      },
      // Patch apps/web/package.json with tailwind devDeps
      {
        kind: "merge-json",
        path: join(webDir, "package.json"),
        patch: {
          devDependencies: {
            tailwindcss: "^4.1.7",
            "@tailwindcss/vite": "^4.1.7",
          },
        },
      },
    ];
  },
};

register(tailwindInstaller);

export { tailwindInstaller };
