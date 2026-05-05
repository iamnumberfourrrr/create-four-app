import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyTemplate } from "../helpers/copy-template.js";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

// "../templates" resolves correctly from dist/index.js (bundled by tsup)
const TEMPLATE_DIR = fileURLToPath(new URL("../templates/web-start", import.meta.url));

const webStartInstaller: Installer = {
  name: "web-start",

  async install(ctx: InstallerContext): Promise<FileOp[]> {
    if (ctx.framework !== "tanstack-start") {
      return [];
    }

    const vars: Record<string, unknown> = {
      projectName: ctx.projectName,
      projectScope: `@${ctx.projectName}`,
      nodeVersion: "22",
    };

    const dest = join(ctx.projectDir, "apps", "web");
    await copyTemplate(TEMPLATE_DIR, dest, vars);

    return [];
  },
};

register(webStartInstaller);

export { webStartInstaller };
