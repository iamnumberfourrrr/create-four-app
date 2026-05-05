# create-four-app

Opinionated CLI that scaffolds a pnpm monorepo with TanStack Start/Router, Drizzle ORM,
Oxlint + Oxfmt, and Vitest browser-mode. Fully composable via an `add <module>` subcommand
after initial scaffolding.

## Install

```bash
pnpm dlx create-four-app my-app
# or
npx create-four-app my-app
```

## Usage

### Scaffold a new project

```bash
pnpm dlx create-four-app my-app
```

Interactive wizard walks through framework selection and all opt-in modules.

### Add a module to an existing project

```bash
cd my-app
create-four-app add tailwind
create-four-app add db          # select dialect in prompt
create-four-app add auth        # select providers in prompt
```

Run from any subdirectory — the CLI walks up to 5 levels to find `.four.json`.

### Non-interactive mode (CI / scripting)

```bash
create-four-app my-app \
  --non-interactive \
  --json-config path/to/config.json \
  --skip-install
```

Config file shape:

```json
{
  "projectName": "my-app",
  "framework": "tanstack-start",
  "modules": {
    "tailwind": true,
    "shadcn": true,
    "db": "postgres",
    "auth": ["email-password", "github"]
  }
}
```

## Module table

| Module | Flag / value | Prerequisites | Description |
|--------|-------------|---------------|-------------|
| tailwind | `tailwind: true` | — | Tailwind CSS v4 via `@tailwindcss/vite` |
| shadcn | `shadcn: true` | tailwind | shadcn/ui Button + Input components |
| i18n | `i18n: true` | — | react-i18next with lazy locale loading |
| zustand | `zustand: true` | — | Zustand global state (example counter store) |
| tanstack-extras | `tanstack: { query, form, ... }` | — | TanStack Query / Form / Table / Virtual / Store / DB / Pacer / Ranger |
| db | `db: "postgres"\|"sqlite"` | — | Drizzle ORM + migrations + schema glob seam |
| worker | `worker: "pgboss"\|"sqlite-poll"` | db | Background job queue |
| auth | `auth: ["email-password", ...]` | db + tanstack-start | better-auth multi-provider |
| docker | `docker: true` | — | Multi-stage Dockerfile + dev compose (db, mailhog) |
| wrangler | `wrangler: true` | db != sqlite | Cloudflare Workers/Pages + Hyperdrive setup |
| ci | `ci: true` | — | GitHub Actions CI workflow |

Auth providers: `email-password`, `github`, `google`, `discord`, `passkeys`

## Generated project structure

```
my-app/
├── apps/
│   ├── web/          # TanStack Start or Router app
│   └── worker/       # Background worker (when worker module selected)
└── packages/
    ├── db/           # Drizzle schema, client, migrations
    └── config/       # Shared zod env config with fragment seam
```

## Composition model

All installers are file-additive — they only create files or merge into existing ones
(JSON deep-merge, YAML merge, string append). No installer ever edits arbitrary user code.

Composition seams:
- `packages/db/src/schema/**/*.ts` — Drizzle schema glob
- `packages/config/env/fragments/*.ts` — env zod fragments
- `apps/web/src/server/auth/providers/*.ts` — better-auth providers
- `apps/web/src/providers/fragments/*.tsx` — React context providers

The `.four.json` at project root tracks installed modules and enables the `add` subcommand.

## CLI flags

```
create-four-app [name]
  --skip-install     Skip pnpm install after scaffolding
  --no-rollback      Do not remove the project dir on failure
  --force            Overwrite files in an existing non-empty directory
  --in-existing      Scaffold into an existing directory
  --non-interactive  Skip prompts (requires --json-config)
  --json-config      Path to JSON answers file

create-four-app add <module>
  --skip-install     Skip pnpm install after adding
  --force            Re-add even if module already recorded in .four.json
```

## Failure handling

`init` rolls back (removes project dir) on any unhandled error unless `--no-rollback` is set.

`add` has NO auto-rollback. Files written during a partial failure stay on disk.
Revert with `git checkout .` if needed.

## Contributing

### Adding a new module

1. Create `src/installers/<name>.ts` implementing the `Installer` interface:
   ```ts
   export interface Installer {
     name: string;
     requires?: string[];   // prereq module names
     conflicts?: string[];  // mutually exclusive modules
     prompt?: (ctx) => Promise<unknown>;
     install: (ctx, config) => FileOp[] | Promise<FileOp[]>;
   }
   ```
2. Register it: `register(myInstaller)` at the bottom of the file.
3. Import it in `src/installers/index.ts` in execution order.
4. Add the module key to `FourState["modules"]` in `src/core/state.ts`.
5. Add idempotency test in `tests/idempotency.test.ts`.

### Template directory layout

```
templates/
├── base/          # Root workspace files (pnpm-workspace.yaml, root package.json, etc.)
├── ci/            # GitHub Actions workflow fragments
├── config/        # packages/config starter
├── readme/        # README.md.mustache for generated project
├── web-router/    # TanStack Router app starter
├── web-start/     # TanStack Start app starter
├── worker/        # apps/worker starter
└── wrangler/      # Cloudflare wrangler fragments
```

### Idempotency contract

Every installer must satisfy: `init(all modules) === init(base) + add(each module)`.
This is verified by the test suite in `tests/idempotency.test.ts`.

Run tests: `pnpm test`

## License

MIT — see [LICENSE](./LICENSE)
