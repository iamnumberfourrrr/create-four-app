/**
 * post-scaffold.ts — rich terminal output printed after all installers run.
 *
 * Prints:
 *   1. Green success line with project name
 *   2. Directory tree (depth 2, dirs only, sorted, ignores noise dirs)
 *   3. "Next steps:" with conditional command bullets
 *   4. Notes from ctx.notes (installer side-channel)
 *   5. URL line
 *
 * Next-steps order (each gated on installed module):
 *   - cd <projectName>                         always
 *   - docker compose up -d                     docker=true AND (db=postgres or auth selected)
 *   - pnpm db:push                             db != none/false
 *   - pnpm db:seed                             auth selected (auth.length > 0)
 *   - pnpm dev                                 always
 *   - pnpm cf:hyperdrive  # configure CF DB    wrangler=true AND db in {postgres, mixed-pg}
 */
import { readdirSync } from "node:fs";
import { join, basename } from "node:path";
import pc from "picocolors";
import type { InstallerContext } from "../core/installer.js";

// Directories to ignore in the tree output
const TREE_IGNORE = new Set([
  "node_modules",
  ".git",
  "dist",
  ".vite",
  ".output",
  ".pglite-data",
  ".cache",
]);

// ─── Tree renderer ────────────────────────────────────────────────────────────

function walkDirs(dir: string, depth: number): string[] {
  if (depth >= 2) return [];

  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirs = entries
    .filter((e) => e.isDirectory() && !TREE_IGNORE.has(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [];
  for (let i = 0; i < dirs.length; i++) {
    const entry = dirs[i];
    if (!entry) continue;
    const isLast = i === dirs.length - 1;
    const prefix = "  ".repeat(depth);
    const connector = isLast ? "└── " : "├── ";
    lines.push(`${prefix}${connector}${entry.name}/`);
    const children = walkDirs(join(dir, entry.name), depth + 1);
    for (const child of children) {
      lines.push(child);
    }
  }
  return lines;
}

function renderTree(projectDir: string): string {
  const rootName = basename(projectDir);
  const children = walkDirs(projectDir, 0);
  return [pc.bold(`${rootName}/`), ...children].join("\n");
}

// ─── Next-steps composer ──────────────────────────────────────────────────────

function buildNextSteps(ctx: InstallerContext): string[] {
  const modules = ctx.modules as Record<string, unknown>;
  const db = modules["db"] as string | false | undefined;
  const docker = modules["docker"] as boolean | undefined;
  const wrangler = modules["wrangler"] as boolean | undefined;
  const auth = modules["auth"] as string[] | undefined;

  const hasDb = db !== false && db !== undefined && db !== "none";
  const hasAuth = Array.isArray(auth) && auth.length > 0;
  // docker compose is useful when postgres (or mixed-pg) is used, or auth (mailhog)
  const hasComposeServices = docker === true && (db === "postgres" || db === "mixed-pg" || hasAuth);
  const hasHyperdrive = wrangler === true && (db === "postgres" || db === "mixed-pg");

  const steps: string[] = [];

  steps.push(`cd ${ctx.projectName}`);

  if (hasComposeServices) {
    steps.push("docker compose up -d");
  }

  if (hasDb) {
    steps.push("pnpm db:push");
  }

  if (hasAuth) {
    steps.push("pnpm db:seed");
  }

  steps.push("pnpm dev");

  if (hasHyperdrive) {
    steps.push("pnpm cf:hyperdrive  # configure Cloudflare DB");
  }

  return steps;
}

// ─── Main printer ─────────────────────────────────────────────────────────────

export function printPostScaffold(ctx: InstallerContext, projectDir: string): void {
  // 1. Success line
  console.log(pc.green(`+ Created ${ctx.projectName}/`));
  console.log();

  // 2. Directory tree
  console.log(renderTree(projectDir));
  console.log();

  // 3. Next steps
  console.log(pc.bold("Next steps:"));
  const steps = buildNextSteps(ctx);
  for (const step of steps) {
    console.log(`  ${pc.cyan(">")} ${step}`);
  }
  console.log();

  // 4. Notes from ctx.notes (installer side-channel warnings)
  if (ctx.notes.length > 0) {
    for (const note of ctx.notes) {
      console.log(pc.yellow(`Note: ${note}`));
    }
    console.log();
  }

  // 5. SETUP.md pointer when modules need manual config
  if (hasManualSetup(ctx)) {
    console.log(pc.bold("Manual setup needed:"));
    console.log(`  Read ${pc.cyan("./SETUP.md")} for step-by-step instructions.`);
    console.log();
  }

  // 6. URL line
  console.log(pc.dim("Open http://localhost:3000"));
}

function hasManualSetup(ctx: InstallerContext): boolean {
  const m = ctx.modules as Record<string, unknown>;
  const auth = m["auth"];
  return Boolean(
    m["wrangler"] ||
      m["docker"] ||
      m["ci"] ||
      m["db"] === "postgres" ||
      m["db"] === "mixed-pg" ||
      m["db"] === "sqlite" ||
      (Array.isArray(auth) && auth.length > 0),
  );
}
