/**
 * readme installer — always runs LAST, generates README.md from mustache template.
 *
 * Pre-computes flat helper flags from ctx.modules before passing to mustache,
 * since the tiny mustache renderer does not support nested property access
 * (e.g. {{tanstack.query}} is unsupported — use {{hasTanstack}} instead).
 *
 * Always overwrites the base README.md emitted by the base installer.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../utils/mustache.js";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

// import.meta.url points to dist/index.js when bundled (one level below pkg root),
// or src/installers/readme.ts in source (two levels below). Detect at runtime.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// When bundled by tsup, all files collapse into dist/index.js → __dirname = dist/
// When run from source, __dirname = src/installers/
const PKG_ROOT = __filename.includes(`dist${"/"}index`)
  ? join(__dirname, "..")
  : join(__dirname, "..", "..");
const TEMPLATE_PATH = join(PKG_ROOT, "templates", "readme", "README.md.mustache");

// ─── Template data builder ────────────────────────────────────────────────────

interface ReadmeData {
  projectName: string;
  frameworkName: string;
  // module flags (flat)
  tailwind: boolean;
  shadcn: boolean;
  i18n: boolean;
  zustand: boolean;
  docker: boolean;
  wrangler: boolean;
  ci: boolean;
  // computed helpers
  hasTanstack: boolean;
  tanstackList: string;
  hasDb: boolean;
  dbDialect: string;
  hasWorker: boolean;
  workerImpl: string;
  hasAuth: boolean;
  authProviders: string;
  hasComposeServices: boolean;
  hasHyperdrive: boolean;
}

function buildReadmeData(ctx: InstallerContext): ReadmeData {
  const m = ctx.modules as Record<string, unknown>;
  const tanstack = m["tanstack"] as Record<string, unknown> | undefined;
  const db = m["db"] as string | false | undefined;
  const worker = m["worker"] as string | false | undefined;
  const auth = m["auth"] as string[] | undefined;
  const docker = Boolean(m["docker"]);
  const wrangler = Boolean(m["wrangler"]);

  // Framework display name
  const frameworkName = ctx.framework === "tanstack-start" ? "TanStack Start" : "TanStack Router";

  // TanStack extras list
  const tanstackParts: string[] = [];
  if (tanstack) {
    if (tanstack["query"]) tanstackParts.push("Query");
    if (tanstack["form"]) tanstackParts.push("Form");
    if (tanstack["table"]) tanstackParts.push("Table");
    if (tanstack["virtual"]) tanstackParts.push("Virtual");
    if (tanstack["store"]) tanstackParts.push("Store");
    if (tanstack["db"]) tanstackParts.push("DB");
    if (tanstack["pacer"]) tanstackParts.push("Pacer");
    if (tanstack["ranger"]) tanstackParts.push("Ranger");
  }
  const hasTanstack = tanstackParts.length > 0;
  const tanstackList = tanstackParts.join(", ");

  // DB
  const hasDb = db !== false && db !== undefined && db !== "none";
  const dbDialectMap: Record<string, string> = {
    postgres: "PostgreSQL",
    sqlite: "SQLite",
    "mixed-pg": "PostgreSQL + PGlite",
  };
  const dbDialect = hasDb && typeof db === "string" ? (dbDialectMap[db] ?? db) : "";

  // Worker
  const hasWorker = worker !== false && worker !== undefined;
  const workerImplMap: Record<string, string> = {
    pgboss: "pg-boss",
    "sqlite-poll": "SQLite poll",
  };
  const workerImpl =
    hasWorker && typeof worker === "string" ? (workerImplMap[worker] ?? worker) : "";

  // Auth
  const hasAuth = Array.isArray(auth) && auth.length > 0;
  const authProviderMap: Record<string, string> = {
    "email-password": "email+password",
    github: "GitHub",
    google: "Google",
    discord: "Discord",
    passkeys: "Passkeys",
  };
  const authProviders = hasAuth
    ? (auth as string[]).map((p) => authProviderMap[p] ?? p).join(", ")
    : "";

  // Compose services: docker AND (postgres/mixed-pg OR auth)
  const hasComposeServices = docker && (db === "postgres" || db === "mixed-pg" || hasAuth);

  // Hyperdrive: wrangler AND (postgres or mixed-pg)
  const hasHyperdrive = wrangler && (db === "postgres" || db === "mixed-pg");

  return {
    projectName: ctx.projectName,
    frameworkName,
    tailwind: Boolean(m["tailwind"]),
    shadcn: Boolean(m["shadcn"]),
    i18n: Boolean(m["i18n"]),
    zustand: Boolean(m["zustand"]),
    docker,
    wrangler,
    ci: Boolean(m["ci"]),
    hasTanstack,
    tanstackList,
    hasDb,
    dbDialect,
    hasWorker,
    workerImpl,
    hasAuth,
    authProviders,
    hasComposeServices,
    hasHyperdrive,
  };
}

// ─── Installer ────────────────────────────────────────────────────────────────

const readmeInstaller: Installer = {
  name: "readme",

  install(ctx: InstallerContext): FileOp[] {
    const template = readFileSync(TEMPLATE_PATH, "utf8");
    const data = buildReadmeData(ctx);

    // Cast to Record<string, unknown> — all values are primitives or booleans,
    // compatible with the mustache renderer's expected input type.
    const content = render(template, data as unknown as Record<string, unknown>);

    return [
      {
        kind: "write",
        path: "README.md",
        content,
        overwrite: true,
      },
    ];
  },
};

register(readmeInstaller);

export { readmeInstaller };
