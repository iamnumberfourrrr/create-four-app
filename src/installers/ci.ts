/**
 * ci installer — emits .github/workflows/ci.yml when modules.ci === true.
 *
 * Composition strategy: string-based header preservation + YAML parse/merge.
 *
 * The top banner comment (# To enable on PR/push...) is NOT parseable by the
 * yaml library since comments are stripped on parse. To preserve it, we treat
 * the workflow as two parts:
 *   1. A literal header string (banner + name + on: + permissions:) — kept verbatim.
 *   2. The jobs section — parsed from base template, fragments appended via
 *      deep-merge, then re-serialized.
 *
 * Conditional fragments appended to jobs:
 *   - migrations-check  when db != false/none
 *   - docker-build      when docker=true
 *   - deploy-cf         when wrangler=true (sourced from templates/wrangler/.github/)
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// When bundled by tsup, all files collapse into dist/index.js → __dirname = dist/
// When run from source, __dirname = src/installers/
const PKG_ROOT = __filename.includes(`dist${"/"}index`)
  ? join(__dirname, "..")
  : join(__dirname, "..", "..");
const TEMPLATES_CI = join(PKG_ROOT, "templates", "ci");
const TEMPLATES_WRANGLER = join(PKG_ROOT, "templates", "wrangler");

// ─── Banner header — preserved verbatim in output ─────────────────────────────
// The yaml library strips comments on parse/stringify, so we keep the top block
// as a literal string and only parse the jobs section from the base template.

const CI_HEADER = `# To enable on PR/push, replace the dispatch block below with:
# on:
#   pull_request:
#   push:
#     branches: [master]
name: CI

on:
  workflow_dispatch:

permissions:
  contents: read

`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type YamlObject = Record<string, unknown>;

function readFragment(filePath: string): YamlObject {
  const raw = readFileSync(filePath, "utf8");
  const parsed = parse(raw) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Fragment is not a YAML object: ${filePath}`);
  }
  return parsed as YamlObject;
}

function extractJobs(obj: YamlObject): YamlObject {
  const jobs = obj["jobs"];
  if (jobs === null || typeof jobs !== "object" || Array.isArray(jobs)) {
    throw new Error("Fragment has no top-level 'jobs' key or jobs is not an object");
  }
  return jobs as YamlObject;
}

function composeWorkflow(ctx: InstallerContext): string {
  const modules = ctx.modules as Record<string, unknown>;
  const db = modules["db"] as string | false | undefined;
  const docker = modules["docker"] as boolean | undefined;
  const wrangler = modules["wrangler"] as boolean | undefined;

  const hasDb = db !== false && db !== undefined && db !== "none" && db !== "sqlite";

  // Parse base workflow — only jobs section used
  const baseDoc = readFragment(join(TEMPLATES_CI, "workflow-base.yml"));
  const jobs: YamlObject = { ...extractJobs(baseDoc) };

  // Append conditional fragments
  if (hasDb) {
    const fragment = readFragment(join(TEMPLATES_CI, "jobs", "migrations-check.yml"));
    Object.assign(jobs, extractJobs(fragment));
  }

  if (docker) {
    const fragment = readFragment(join(TEMPLATES_CI, "jobs", "docker-build.yml"));
    Object.assign(jobs, extractJobs(fragment));
  }

  if (wrangler) {
    const fragmentPath = join(TEMPLATES_WRANGLER, ".github", "deploy-fragment.yml");
    const fragment = readFragment(fragmentPath);
    Object.assign(jobs, extractJobs(fragment));
  }

  // Re-serialize jobs section only (preserves structure cleanly)
  const jobsYaml = stringify({ jobs });

  return CI_HEADER + jobsYaml;
}

// ─── Installer ────────────────────────────────────────────────────────────────

const ciInstaller: Installer = {
  name: "ci",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    if (!modules["ci"]) return [];

    const content = composeWorkflow(ctx);
    const wantsWranglerDeploy = Boolean(modules["wrangler"]);

    return [
      {
        kind: "write",
        path: join(".github", "workflows", "ci.yml"),
        content,
      },
      {
        kind: "append",
        path: "SETUP.md",
        content: buildCiSetupSection(wantsWranglerDeploy),
      },
    ];
  },
};

function buildCiSetupSection(wantsWranglerDeploy: boolean): string {
  const wranglerBlock = wantsWranglerDeploy
    ? `

### Cloudflare deploy from CI

To let CI run \`pnpm deploy:cf\`, add these secrets via the GitHub UI or CLI:

\`\`\`
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
\`\`\`

Use a token created with the **Edit Cloudflare Workers** template (see the
Cloudflare Workers section above). The CI workflow already references
both secrets — no edits required.`
    : "";

  return `
## GitHub Actions CI

The generated \`.github/workflows/ci.yml\` runs typecheck + lint + test on
every push and PR. It needs no secrets to start.
${wranglerBlock}

### Branch protection (recommended)

In GitHub → **Settings** → **Branches** → add a rule for \`main\` (or your
default branch) requiring the \`ci\` workflow to pass before merging.

---
`;
}

register(ciInstaller);

export { ciInstaller };
