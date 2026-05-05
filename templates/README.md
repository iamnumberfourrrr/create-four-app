# Templates

Static template directories copied and mustache-rendered by each installer.

## Substitution tokens

| Token              | Value                          | Example   |
| ------------------ | ------------------------------ | --------- |
| `{{projectName}}`  | Raw project name               | `my-app`  |
| `{{projectScope}}` | Scoped name (`@<projectName>`) | `@my-app` |
| `{{nodeVersion}}`  | Node version from `.nvmrc`     | `22`      |

Tokens are rendered by `src/utils/mustache.ts`. Files ending in `.mustache`
have that suffix stripped on output (e.g. `tsconfig.json.mustache` → `tsconfig.json`).
Binary files (images, fonts, archives) are copied verbatim — no rendering.

## Directories

| Directory     | Installer    | Output path        |
| ------------- | ------------ | ------------------ |
| `base/`       | `base`       | project root       |
| `config/`     | `config`     | `packages/config/` |
| `web-start/`  | `web-start`  | `apps/web/`        |
| `web-router/` | `web-router` | `apps/web/`        |
| `worker/`     | `worker`     | `apps/worker/`     |

## Seam directories (empty in phase 02)

These dirs are created by `mkdir` FileOps and populated by later phases:

- `apps/web/src/providers/fragments/` — React provider fragments (phase 03)
- `apps/web/src/server/auth/providers/` — better-auth providers (phase 05, Start only)
- `packages/config/env/fragments/` — env zod fragments (phase 04)
- `apps/worker/src/jobs/` — job handlers (phase 04)
