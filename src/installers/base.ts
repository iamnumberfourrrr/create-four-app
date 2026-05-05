import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyTemplate } from "../helpers/copy-template.js";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

// "../templates" resolves correctly from both dist/index.js (bundled) and src/installers/*.ts (dev)
// When bundled by tsup, import.meta.url = dist/index.js → ../templates = repo root templates/
const TEMPLATE_DIR = fileURLToPath(new URL("../templates/base", import.meta.url));

const baseInstaller: Installer = {
  name: "base",

  async install(ctx: InstallerContext): Promise<FileOp[]> {
    const vars: Record<string, unknown> = {
      projectName: ctx.projectName,
      projectScope: `@${ctx.projectName}`,
      nodeVersion: "22",
    };

    await copyTemplate(TEMPLATE_DIR, ctx.projectDir, vars);

    // Explicit mkdir for seam directories — ensures they exist even if copyTemplate
    // skips dirs containing only .gitkeep (belt-and-suspenders for later phase drops)
    const seams: FileOp[] = [
      { kind: "mkdir", path: join("apps", "web", "src", "providers", "fragments") },
      { kind: "mkdir", path: join("apps", "web", "src", "server", "auth", "providers") },
      { kind: "mkdir", path: join("packages", "config", "env", "fragments") },
      { kind: "mkdir", path: join("apps", "worker", "src", "jobs") },
    ];

    return seams;
  },
};

register(baseInstaller);

export { baseInstaller };
