/**
 * wrangler-hyperdrive sub-installer.
 *
 * Triggered internally by the wrangler installer when:
 *   wrangler=yes AND db ∈ {postgres, mixed-pg}
 *
 * Drops:
 *   - scripts/setup-hyperdrive.ts  TS script that reads .env, shells
 *     `wrangler hyperdrive create`, parses returned ID, patches
 *     apps/web/wrangler.jsonc, updates .four.json
 *   - root package.json script: cf:hyperdrive → tsx scripts/setup-hyperdrive.ts
 *
 * The setup-hyperdrive.ts script is executed at deploy-prep time (not scaffold
 * time) — it requires a live Cloudflare account with API token.
 */
import { join } from "node:path";
import type { FileOp, InstallerContext } from "../core/installer.js";

// ─── scripts/setup-hyperdrive.ts content ─────────────────────────────────────

function buildHyperdriveScript(projectName: string): string {
  return `#!/usr/bin/env tsx
/**
 * setup-hyperdrive.ts
 *
 * Creates a Cloudflare Hyperdrive resource for this project and patches
 * apps/web/wrangler.jsonc with the resulting binding ID.
 *
 * Prerequisites:
 *   - wrangler installed and authenticated (wrangler login)
 *   - .env contains DATABASE_URL (postgres:// URL — NOT pglite://)
 *   - .env contains CLOUDFLARE_ACCOUNT_ID
 *
 * Usage:
 *   pnpm cf:hyperdrive          # create + patch wrangler.jsonc
 *   pnpm cf:hyperdrive --force  # overwrite existing HYPERDRIVE binding
 *
 * The script is idempotent: without --force it refuses if HYPERDRIVE binding
 * already exists in wrangler.jsonc. With --force it replaces the binding.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const force = process.argv.includes("--force");
const projectRoot = resolve(import.meta.dirname, "..");
const wranglerPath = join(projectRoot, "apps", "web", "wrangler.jsonc");
const fourJsonPath = join(projectRoot, ".four.json");
const envPath = join(projectRoot, ".env");

// ── Read .env ─────────────────────────────────────────────────────────────────
function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    throw new Error(\`Missing .env file at \${path}. Copy .env.example and fill in values.\`);
  }
  const result: Record<string, string> = {};
  const lines = readFileSync(path, "utf8").split("\\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = val;
  }
  return result;
}

const env = parseEnvFile(envPath);

const databaseUrl = env["DATABASE_URL"];
if (!databaseUrl) {
  console.error("ERROR: DATABASE_URL is not set in .env");
  process.exit(1);
}
if (databaseUrl.startsWith("pglite://") || databaseUrl.startsWith("file:")) {
  console.error(
    "ERROR: DATABASE_URL looks like a local/pglite URL (" + databaseUrl.slice(0, 20) + "...).",
    "\\nHyperdrive requires a remote PostgreSQL connection string (postgres:// or postgresql://).",
    "\\nSet DATABASE_URL to your production or staging Postgres URL before running this script.",
  );
  process.exit(1);
}

const accountId = env["CLOUDFLARE_ACCOUNT_ID"];
if (!accountId) {
  console.error(
    "ERROR: CLOUDFLARE_ACCOUNT_ID is not set in .env.",
    "\\nFind your Account ID at: https://dash.cloudflare.com/ → right sidebar.",
  );
  process.exit(1);
}

// ── Check wrangler CLI ─────────────────────────────────────────────────────────
try {
  execSync("wrangler --version", { stdio: "pipe" });
} catch {
  console.error(
    "ERROR: wrangler CLI not found.",
    "\\nInstall it: pnpm add -g wrangler",
    "\\nThen authenticate: wrangler login",
  );
  process.exit(1);
}

// ── Read wrangler.jsonc ────────────────────────────────────────────────────────
if (!existsSync(wranglerPath)) {
  console.error(\`ERROR: wrangler.jsonc not found at \${wranglerPath}.\`);
  process.exit(1);
}
const wranglerRaw = readFileSync(wranglerPath, "utf8");

// Check for existing HYPERDRIVE binding (simple string search — jsonc may have comments)
const hasExistingBinding = wranglerRaw.includes('"HYPERDRIVE"') || wranglerRaw.includes("HYPERDRIVE");
if (hasExistingBinding && !force) {
  console.error(
    "ERROR: HYPERDRIVE binding already exists in wrangler.jsonc.",
    "\\nRun with --force to overwrite: pnpm cf:hyperdrive --force",
  );
  process.exit(1);
}

// ── Create Hyperdrive resource ─────────────────────────────────────────────────
const resourceName = "${projectName}-db";
console.log(\`Creating Hyperdrive resource "\${resourceName}"...\`);
console.log("(This connects Cloudflare to your Postgres database)");

let wranglerOutput: string;
try {
  wranglerOutput = execSync(
    \`wrangler hyperdrive create "\${resourceName}" --connection-string="\${databaseUrl}"\`,
    { encoding: "utf8", env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId } },
  );
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("ERROR: wrangler hyperdrive create failed:");
  console.error(msg);
  console.error("\\nMake sure you are authenticated: wrangler login");
  process.exit(1);
}

// ── Parse Hyperdrive ID from output ───────────────────────────────────────────
// wrangler outputs a line like:  id: "abc123def456..."
const idMatch = wranglerOutput.match(/["']?id["']?\\s*[:=]\\s*["']?([a-f0-9]{32,})["']?/i);
if (!idMatch || !idMatch[1]) {
  console.error("ERROR: Could not parse Hyperdrive ID from wrangler output:");
  console.error(wranglerOutput);
  process.exit(1);
}
const hyperdriveId = idMatch[1];
console.log(\`Hyperdrive ID: \${hyperdriveId}\`);

// ── Patch wrangler.jsonc ───────────────────────────────────────────────────────
// Parse the JSONC (strip single-line comments for JSON.parse)
// oxlint-disable-next-line no-useless-escape -- regex literal inside generated string
const strippedForParse = wranglerRaw.replace(/^\\s*\\/\\/.*$/gm, "").replace(/,(\\s*[}\\]])/g, "$1");
let wranglerConfig: Record<string, unknown>;
try {
  wranglerConfig = JSON.parse(strippedForParse) as Record<string, unknown>;
} catch {
  console.error("ERROR: Could not parse wrangler.jsonc as JSON.");
  process.exit(1);
}

const hyperdrive = [{ binding: "HYPERDRIVE", id: hyperdriveId }];
if (hasExistingBinding && force) {
  // Replace existing hyperdrive array
  wranglerConfig["hyperdrive"] = hyperdrive;
  console.log("Replaced existing HYPERDRIVE binding (--force).");
} else {
  wranglerConfig["hyperdrive"] = hyperdrive;
}

// Re-serialize preserving the comment header + new config
const newContent = JSON.stringify(wranglerConfig, null, 2) + "\\n";
writeFileSync(wranglerPath, newContent, "utf8");
console.log(\`Patched \${wranglerPath} with HYPERDRIVE binding.\`);

// ── Update .four.json ─────────────────────────────────────────────────────────
if (existsSync(fourJsonPath)) {
  try {
    const fourRaw = readFileSync(fourJsonPath, "utf8");
    const fourState = JSON.parse(fourRaw) as Record<string, unknown>;
    fourState["hyperdrive"] = hyperdriveId;
    writeFileSync(fourJsonPath, JSON.stringify(fourState, null, 2) + "\\n", "utf8");
    console.log("Updated .four.json with hyperdrive ID.");
  } catch {
    console.warn("WARN: Could not update .four.json — update it manually: hyperdrive: \\"" + hyperdriveId + "\\"");
  }
}

console.log("\\nHyperdrive setup complete.");
console.log("Next steps:");
console.log("  1. Deploy your worker: pnpm deploy:cf");
console.log("  2. Verify the binding in Cloudflare dashboard");
`;
}

// ─── SETUP.md section ────────────────────────────────────────────────────────

const SETUP_SECTION_HYPERDRIVE = `
## Cloudflare Hyperdrive (Postgres connection pooler)

Hyperdrive caches connections + queries between your Worker and your
Postgres database. Required for production deploys; skip for local dev.

### Prerequisites

- Your real \`DATABASE_URL\` (postgres://, NOT pglite://) is in \`.env\`.
- The Cloudflare account ID + API token are configured (see the Cloudflare
  Workers section above).

### Run the setup script

\`\`\`
pnpm cf:hyperdrive
\`\`\`

This script:
1. Calls \`wrangler hyperdrive create\` with your DATABASE_URL.
2. Parses the returned ID.
3. Patches \`apps/web/wrangler.jsonc\` with the HYPERDRIVE binding.
4. Records the ID in \`.four.json\` for tracking.

Re-run with \`--force\` to replace an existing binding (e.g. database moved).

### Use it in code

Inside a Worker request handler the binding is exposed as \`env.HYPERDRIVE\`.
The Drizzle setup in \`packages/db/\` reads from
\`HYPERDRIVE.connectionString\` when running on Cloudflare; locally it
falls back to \`DATABASE_URL\`.

---
`;

// ─── Sub-installer function (called by wrangler installer) ───────────────────

export function buildHyperdriveOps(ctx: InstallerContext): FileOp[] {
  const modules = ctx.modules as Record<string, unknown>;
  const db = modules["db"] as string | false | undefined;

  const needsHyperdrive = db === "postgres" || db === "mixed-pg";

  if (!needsHyperdrive) return [];

  return [
    {
      kind: "write",
      path: join("scripts", "setup-hyperdrive.ts"),
      content: buildHyperdriveScript(ctx.projectName),
    },
    {
      kind: "merge-json",
      path: "package.json",
      patch: {
        scripts: {
          "cf:hyperdrive": "tsx scripts/setup-hyperdrive.ts",
        },
        devDependencies: {
          tsx: "^4.19.4",
        },
      },
    },
    {
      kind: "append",
      path: "SETUP.md",
      content: SETUP_SECTION_HYPERDRIVE,
    },
  ];
}
