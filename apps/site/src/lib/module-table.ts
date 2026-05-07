export interface ModuleRow {
  module: string;
  flag: string;
  prereq: string;
  description: string;
  files: string[];
}

export const MODULE_ROWS: ModuleRow[] = [
  {
    module: "tailwind",
    flag: "tailwind: true",
    prereq: "",
    description: "Tailwind CSS v4 via @tailwindcss/vite, zero PostCSS config.",
    files: [
      "apps/web/src/styles/globals.css",
      "apps/web/vite.config.ts (plugin registration)",
    ],
  },
  {
    module: "shadcn",
    flag: "shadcn: true",
    prereq: "tailwind",
    description: "shadcn/ui Button + Input, ready to extend.",
    files: [
      "apps/web/src/components/ui/button.tsx",
      "apps/web/src/components/ui/input.tsx",
      "apps/web/src/lib/utils.ts",
    ],
  },
  {
    module: "i18n",
    flag: "i18n: true",
    prereq: "",
    description: "react-i18next with lazy locale loading and a fragment provider.",
    files: [
      "apps/web/src/i18n/index.ts",
      "apps/web/src/i18n/locales/en.json",
      "apps/web/src/providers/fragments/i18n.tsx",
    ],
  },
  {
    module: "zustand",
    flag: "zustand: true",
    prereq: "",
    description: "Zustand global state with an example counter store.",
    files: [
      "apps/web/src/stores/counter.ts",
      "apps/web/src/stores/index.ts",
    ],
  },
  {
    module: "tanstack-extras",
    flag: 'tanstack: { query, form, ... }',
    prereq: "",
    description:
      "Query, Form, Table, Virtual, Store, DB, Pacer, Ranger; opt-in per package.",
    files: [
      "apps/web/package.json (dependency additions)",
      "apps/web/src/providers/fragments/query.tsx",
    ],
  },
  {
    module: "db",
    flag: 'db: "postgres" | "sqlite"',
    prereq: "",
    description: "Drizzle ORM, migrations, and a glob seam for schema files.",
    files: [
      "packages/db/package.json",
      "packages/db/src/client.ts",
      "packages/db/src/schema/index.ts",
      "packages/db/drizzle.config.ts",
      "packages/config/env/fragments/db.ts",
    ],
  },
  {
    module: "worker",
    flag: 'worker: "pgboss" | "sqlite-poll"',
    prereq: "db",
    description: "Background job queue scaffold with a strongly-typed job table.",
    files: [
      "apps/worker/package.json",
      "apps/worker/src/index.ts",
      "apps/worker/src/jobs/example.ts",
    ],
  },
  {
    module: "auth",
    flag: 'auth: ["email-password", ...]',
    prereq: "db + tanstack-start",
    description: "better-auth multi-provider with a glob seam for new providers.",
    files: [
      "apps/web/src/server/auth/index.ts",
      "apps/web/src/server/auth/providers/email-password.ts",
      "packages/db/src/schema/auth.ts",
      "apps/web/src/providers/fragments/auth.tsx",
    ],
  },
  {
    module: "docker",
    flag: "docker: true",
    prereq: "",
    description: "Multi-stage Dockerfile and a dev compose with db plus mailhog.",
    files: ["Dockerfile", "docker-compose.yml", ".dockerignore"],
  },
  {
    module: "wrangler",
    flag: "wrangler: true",
    prereq: "db != sqlite",
    description: "Cloudflare Workers / Pages with Hyperdrive wired to the db package.",
    files: [
      "wrangler.jsonc",
      "apps/web/src/server/hyperdrive.ts",
      "packages/config/env/fragments/wrangler.ts",
    ],
  },
  {
    module: "ci",
    flag: "ci: true",
    prereq: "",
    description: "GitHub Actions workflow for typecheck, lint, format, and test.",
    files: [".github/workflows/ci.yml"],
  },
];
