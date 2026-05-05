# Changelog

All notable changes to `create-four-app` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## 0.1.0 — 2026-05-04

Initial release.

### Added

**CLI foundation**
- `create-four-app [name]` — interactive wizard scaffolds a pnpm monorepo
- `create-four-app add <module>` — add any opt-in module to an existing project
- `--non-interactive --json-config <path>` — bypass prompts for CI and scripting
- `--skip-install`, `--no-rollback`, `--force`, `--in-existing` global flags
- `.four.json` state file tracks framework and installed modules
- Auto-rollback on init failure (removes project dir); `add` has no rollback by design
- `find .four.json` walks up to 5 parent directories from cwd

**Frameworks**
- TanStack Start (full-stack SSR with Vite)
- TanStack Router (SPA)

**Opt-in modules**
- `tailwind` — Tailwind CSS v4 via `@tailwindcss/vite`
- `shadcn` — shadcn/ui Button + Input components (requires tailwind)
- `i18n` — react-i18next with lazy locale loading and browser language detection
- `zustand` — Zustand global state with example counter store
- `tanstack-extras` — multi-select: Query, Form, Table, Virtual, Store, DB, Pacer, Ranger
- `db` — Drizzle ORM with dialect choice: PostgreSQL, SQLite (libsql), or mixed-pg (PGlite dev / PostgreSQL prod)
- `worker` — background job queue: pg-boss (PostgreSQL) or SQLite poll (requires db)
- `auth` — better-auth multi-provider: email+password, GitHub, Google, Discord, Passkeys (requires db + tanstack-start)
- `docker` — multi-stage Dockerfile + dev compose with database and Mailhog services
- `wrangler` — Cloudflare Workers/Pages with Hyperdrive DB proxy setup (requires db != sqlite)
- `ci` — GitHub Actions CI workflow with lint, typecheck, test, and build jobs

**Composition model**
- File-additive installer pipeline: write, merge-json, merge-yaml, append operations only
- Schema glob seam: `packages/db/src/schema/**/*.ts`
- Env fragment seam: `packages/config/env/fragments/*.ts`
- Provider fragment seam: `apps/web/src/providers/fragments/*.tsx`
- Auth provider seam: `apps/web/src/server/auth/providers/*.ts`
- Package.json dependency blocks sorted alphabetically for deterministic output

**Post-scaffold output**
- Directory tree (depth 2)
- Conditional next-steps (cd, docker compose, db:push, db:seed, dev, cf:hyperdrive)
- Module-specific notes and warnings
- Generated README.md with module summary

**Testing**
- Idempotency test harness: verifies `init(module=true)` === `init(module=false) + add(module)` byte-for-byte
- Non-interactive mode enables programmatic CLI invocation in tests
- Tree-diff helper for recursive byte-level directory comparison

**Publish prep**
- GitHub Actions release workflow on `v*` tag push with npm provenance attestation
- `package.json` fields: `files`, `keywords`, `repository`, `bugs`, `homepage`, `engines`
- MIT License

### Known limitations (post-v1 roadmap)

- No `remove` subcommand (door is open via pure-installer contract)
- SQLite + Wrangler combination is refused (Cloudflare D1 path not yet implemented)
- Auth only available with TanStack Start (no SSR in Router mode)
- No multi-locale bootstrap (English only in v0.1.0)
