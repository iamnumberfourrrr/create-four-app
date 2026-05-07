/**
 * wrangler installer — Cloudflare Workers (Start) or Pages (Router) deploy config.
 *
 * Defensive gate: db=sqlite → throws immediately (D1 driver out of scope for v1).
 *
 * Framework branches:
 *   tanstack-start  → Workers config: nodejs_compat + main .output/server/index.mjs
 *   tanstack-router → Pages config: pages_build_output_dir: dist
 *
 * Always emits:
 *   - apps/web/wrangler.jsonc (framework-specific)
 *   - root package.json script: deploy:cf
 *   - .env.example append: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN
 *   - apps/web/package.json devDep: wrangler@^4
 *
 * For tanstack-start also:
 *   - apps/web/package.json dep: @opennextjs/cloudflare (Cloudflare adapter)
 *
 * Triggers wrangler-hyperdrive sub-installer when db ∈ {postgres, mixed-pg}.
 *
 * Drops CI fragment: templates/wrangler/.github/deploy-fragment.yml
 * (read by phase-07 CI installer when wrangler=true).
 */
import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";
import { buildHyperdriveOps } from "./wrangler-hyperdrive.js";

// ─── wrangler.jsonc: TanStack Start (Workers) ────────────────────────────────

function buildWranglerStart(projectName: string): string {
  return `{
  // Cloudflare Workers configuration for TanStack Start (SSR).
  // Run \`pnpm deploy:cf\` to deploy.
  // Run \`pnpm cf:hyperdrive\` first if using Postgres (sets HYPERDRIVE binding).
  "name": "${projectName}",
  "main": ".output/server/index.mjs",
  "compatibility_date": "2025-09-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".output/public",
    "binding": "ASSETS"
  }
  // After running \`pnpm cf:hyperdrive\`, the following will be added automatically:
  // "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<set-by-setup-hyperdrive-script>" }]
}
`;
}

// ─── wrangler.jsonc: TanStack Router (Pages) ─────────────────────────────────

function buildWranglerRouter(projectName: string): string {
  return `{
  // Cloudflare Pages configuration for TanStack Router (SPA).
  // Run \`pnpm deploy:cf\` to deploy.
  "name": "${projectName}",
  "pages_build_output_dir": "dist",
  "compatibility_date": "2025-09-01"
}
`;
}

// ─── .env.example append ─────────────────────────────────────────────────────

const ENV_EXAMPLE_APPEND = `
# Cloudflare (deploy-only — not needed for local dev)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
`;

// ─── .gitignore append ───────────────────────────────────────────────────────

const GITIGNORE_APPEND = `
# Cloudflare / wrangler
.wrangler/
.dev.vars
apps/*/.wrangler/
`;

// ─── SETUP.md section: Cloudflare account ─────────────────────────────────────

function buildSetupSectionWrangler(projectName: string): string {
  return `
## Cloudflare Workers / Pages

Required to run \`pnpm deploy:cf\`. Local \`pnpm dev\` does not need this.

### 1. Find your Account ID

Open https://dash.cloudflare.com → any workers page → the right sidebar shows
**Account ID**. Copy it into \`.env\`:

\`\`\`
CLOUDFLARE_ACCOUNT_ID=<your-32-char-id>
\`\`\`

### 2. Create an API token

https://dash.cloudflare.com/profile/api-tokens → **Create Token** →
**Edit Cloudflare Workers** template. Scope it to your account; no zone
permissions are needed unless you bind a custom domain (see step 4). Copy
the token into \`.env\`:

\`\`\`
CLOUDFLARE_API_TOKEN=<your-token>
\`\`\`

### 3. Authenticate the wrangler CLI

\`\`\`
pnpm --filter ${projectName} exec wrangler login
\`\`\`

Or use the API token from step 2 directly: wrangler reads \`CLOUDFLARE_API_TOKEN\`
from the env automatically.

### 4. (Optional) Custom domain

In \`apps/web/wrangler.jsonc\`, add:

\`\`\`jsonc
"routes": [
  { "pattern": "<your-domain>", "custom_domain": true }
]
\`\`\`

The zone for \`<your-domain>\` must already be on Cloudflare. Widen the API
token in step 2 to include **Zone: DNS: Edit** and **Zone: Workers Routes: Edit**
for that zone, then redeploy.

### 5. Deploy

\`\`\`
pnpm deploy:cf
\`\`\`

Verify the URL printed by wrangler returns 200.

---
`;
}


// ─── Installer ────────────────────────────────────────────────────────────────

const wranglerInstaller: Installer = {
  name: "wrangler",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;

    if (!modules["wrangler"]) return [];

    const db = modules["db"] as string | false | undefined;

    // Defensive gate: sqlite + wrangler is not supported in v1
    if (db === "sqlite") {
      throw new Error(
        "wrangler + sqlite is not supported in v1 — Cloudflare D1 driver is out of scope.\n" +
          "Pick postgres or mixed-pg when using wrangler, or remove the wrangler module.",
      );
    }

    const isStart = ctx.framework === "tanstack-start";
    const webDir = join("apps", "web");

    const wranglerJsonc = isStart
      ? buildWranglerStart(ctx.projectName)
      : buildWranglerRouter(ctx.projectName);

    const deployScript = isStart ? "wrangler deploy" : "wrangler pages deploy apps/web/dist";

    const ops: FileOp[] = [
      // wrangler.jsonc
      {
        kind: "write",
        path: join(webDir, "wrangler.jsonc"),
        content: wranglerJsonc,
      },

      // deploy:cf root script
      {
        kind: "merge-json",
        path: "package.json",
        patch: {
          scripts: {
            "deploy:cf": deployScript,
          },
        },
      },

      // .env.example append
      {
        kind: "append",
        path: ".env.example",
        content: ENV_EXAMPLE_APPEND,
      },

      // .gitignore append (wrangler-specific cache + dev vars)
      {
        kind: "append",
        path: ".gitignore",
        content: GITIGNORE_APPEND,
      },

      // SETUP.md section — Cloudflare account + API token + (optional) custom domain
      {
        kind: "append",
        path: "SETUP.md",
        content: buildSetupSectionWrangler(ctx.projectName),
      },

      // wrangler devDep in apps/web
      {
        kind: "merge-json",
        path: join(webDir, "package.json"),
        patch: {
          devDependencies: {
            wrangler: "^4.14.4",
          },
        },
      },

      // .four.json update
      {
        kind: "merge-json",
        path: ".four.json",
        patch: { modules: { wrangler: true } },
      },
    ];

    // TanStack Start: add Cloudflare adapter dep
    if (isStart) {
      ops.push({
        kind: "merge-json",
        path: join(webDir, "package.json"),
        patch: {
          dependencies: {
            "@opennextjs/cloudflare": "^1.3.2",
          },
        },
      });
    }

    // Hyperdrive sub-installer (when db is postgres or mixed-pg)
    const hyperdriveOps = buildHyperdriveOps(ctx);
    for (const op of hyperdriveOps) {
      ops.push(op);
    }

    return ops;
  },
};

register(wranglerInstaller);

export { wranglerInstaller };
