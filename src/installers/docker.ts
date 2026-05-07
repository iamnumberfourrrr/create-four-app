/**
 * docker installer — multi-target Dockerfile + conditional dev compose.
 *
 * Always emits:
 *   - Dockerfile (multi-target: base → build → web-deps → worker-deps →
 *                 web-runtime → worker-runtime; + migrator when db != none)
 *   - .dockerignore
 *   - root package.json docker:* scripts
 *
 * Conditionally emits docker-compose.yml when infra services are needed:
 *   - db=postgres / db=mixed-pg → postgres service (mixed-pg dormant under `pg` profile)
 *   - auth selected             → mailhog service
 *   - db != none/false/sqlite   → db-migrate one-shot service
 *
 * Framework variants:
 *   - tanstack-start  → web-runtime uses node:22-alpine (SSR server)
 *   - tanstack-router → web-runtime uses nginx:alpine (SPA static files)
 *
 * Router variant also drops nginx.conf with try_files SPA fallback.
 */
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";
import { buildComposeContent } from "./docker-compose.js";

// ─── Dockerfile: shared base + build stages ───────────────────────────────────

function buildDockerfileBase(projectName: string, hasDb: boolean): string {
  void hasDb;
  return `# syntax=docker/dockerfile:1.7
# Multi-target Dockerfile — see docs/deployment-guide.md for usage.
#
# Targets:
#   web-runtime    Production web server (Start: Node / Router: nginx)
#   worker-runtime Background job worker
#   migrator       One-shot DB migration runner (only when db != none)
#
# Build: docker buildx bake
# Run:   docker compose up -d  (dev infra only — see docker-compose.yml)

ARG NODE_VERSION=22-alpine

# ── Base: workspace files + pnpm ─────────────────────────────────────────────
FROM node:\${NODE_VERSION} AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps apps
COPY packages packages

# ── Build: install all deps + compile everything ──────────────────────────────
FROM base AS build
RUN pnpm install --frozen-lockfile
RUN pnpm -r build

# ── web-deps: production-only node_modules for web ───────────────────────────
FROM base AS web-deps
RUN pnpm --filter @${projectName}/web --prod deploy /out/web

# ── worker-deps: production-only node_modules for worker ─────────────────────
FROM base AS worker-deps
RUN pnpm --filter @${projectName}/worker --prod deploy /out/worker
`;
}

// ─── web-runtime: TanStack Start (Node SSR) ───────────────────────────────────

function buildWebRuntimeStart(projectName: string, hasDb: boolean): string {
  const base = buildDockerfileBase(projectName, hasDb);
  const migratorTarget = hasDb
    ? `
# ── Migrator (one-shot: runs pnpm db:migrate and exits) ──────────────────────
FROM base AS migrator
WORKDIR /repo/packages/db
CMD ["pnpm", "db:migrate"]
`
    : "";

  return (
    base +
    `
# ── web-runtime: TanStack Start — Node.js SSR server ─────────────────────────
FROM node:\${NODE_VERSION} AS web-runtime
WORKDIR /app
COPY --from=web-deps /out/web .
COPY --from=build /repo/apps/web/.output ./.output
EXPOSE 3000
# Run as non-root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \\
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1
CMD ["node", ".output/server/index.mjs"]

# ── worker-runtime: background queue worker ───────────────────────────────────
FROM node:\${NODE_VERSION} AS worker-runtime
WORKDIR /app
COPY --from=worker-deps /out/worker .
COPY --from=build /repo/apps/worker/dist ./dist
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \\
  CMD node -e "process.exit(0)" || exit 1
CMD ["node", "dist/index.js"]
` +
    migratorTarget
  );
}

// ─── web-runtime: TanStack Router (nginx static) ──────────────────────────────

function buildWebRuntimeRouter(projectName: string, hasDb: boolean): string {
  const base = buildDockerfileBase(projectName, hasDb);
  const migratorTarget = hasDb
    ? `
# ── Migrator (one-shot: runs pnpm db:migrate and exits) ──────────────────────
FROM base AS migrator
WORKDIR /repo/packages/db
CMD ["pnpm", "db:migrate"]
`
    : "";

  return (
    base +
    `
# ── web-runtime: TanStack Router — nginx static SPA ─────────────────────────
FROM nginx:1.27-alpine AS web-runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \\
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# ── worker-runtime: background queue worker ───────────────────────────────────
FROM node:22-alpine AS worker-runtime
WORKDIR /app
COPY --from=worker-deps /out/worker .
COPY --from=build /repo/apps/worker/dist ./dist
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \\
  CMD node -e "process.exit(0)" || exit 1
CMD ["node", "dist/index.js"]
` +
    migratorTarget
  );
}

// ─── nginx.conf (Router/SPA fallback) ─────────────────────────────────────────

const NGINX_CONF = `server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

    # SPA deep-link fallback — serve index.html for all unknown paths
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
`;

// ─── .dockerignore ────────────────────────────────────────────────────────────

const DOCKERIGNORE = `# Node
node_modules
**/node_modules
**/.pnpm-store

# Build outputs (will be rebuilt inside Docker)
**/dist
**/.output
**/build

# Dev/test artifacts
**/.vitest
**/coverage
**/.turbo

# Local env — never bake secrets into images
.env
.env.*
!.env.example

# Editor / OS
.DS_Store
**/.DS_Store
.idea
.vscode
*.log
*.local

# Git
.git
.gitignore
`;

// ─── SETUP.md builder ────────────────────────────────────────────────────────

function buildDockerSetupSection(hasCompose: boolean): string {
  const composeBlock = hasCompose
    ? `
### Local infrastructure (docker-compose)

The generated \`docker-compose.yml\` runs the services your modules need
(Postgres, etc.). Start them in the background:

\`\`\`
docker compose up -d
docker compose logs -f
\`\`\`

Stop with \`docker compose down\`. Data lives in named volumes — wipe with
\`docker compose down -v\`.

`
    : "";

  return `
## Docker

### Prerequisites

Install Docker Desktop (Mac/Windows) or Docker Engine + buildx (Linux):
https://docs.docker.com/get-docker/.

${composeBlock}### Build the app image

\`\`\`
pnpm docker:build
\`\`\`

This invokes \`docker buildx bake\` against the multi-stage \`Dockerfile\`.
Output is the \`web\` runtime image. Push it to your registry of choice.

---
`;
}

// ─── Installer ────────────────────────────────────────────────────────────────

const dockerInstaller: Installer = {
  name: "docker",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;

    if (!modules["docker"]) return [];

    const db = modules["db"] as string | false | undefined;
    const auth = modules["auth"] as string[] | undefined;
    const isStart = ctx.framework === "tanstack-start";
    const hasDb = db !== false && db !== undefined && db !== "none" && db !== "sqlite";
    const hasAuth = Array.isArray(auth) && auth.length > 0;
    const dbValue: string | false =
      db === undefined || db === "none" ? false : (db as string | false);

    const dockerfile = isStart
      ? buildWebRuntimeStart(ctx.projectName, hasDb)
      : buildWebRuntimeRouter(ctx.projectName, hasDb);

    const ops: FileOp[] = [
      {
        kind: "write",
        path: "Dockerfile",
        content: dockerfile,
      },
      {
        kind: "write",
        path: ".dockerignore",
        content: DOCKERIGNORE,
      },
      {
        kind: "merge-json",
        path: "package.json",
        patch: {
          scripts: {
            "docker:build": "docker buildx bake",
            "docker:up": "docker compose up -d",
            "docker:logs": "docker compose logs -f",
            "docker:down": "docker compose down",
          },
        },
      },
    ];

    // nginx.conf for Router SPA variant
    if (!isStart) {
      ops.push({
        kind: "write",
        path: "nginx.conf",
        content: NGINX_CONF,
      });
    }

    // Conditionally emit docker-compose.yml
    const composeContent = buildComposeContent({
      projectName: ctx.projectName,
      db: dbValue,
      hasAuth,
    });

    if (composeContent !== null) {
      ops.push({
        kind: "write",
        path: "docker-compose.yml",
        content: composeContent,
      });
    }

    // .four.json update
    ops.push({
      kind: "merge-json",
      path: ".four.json",
      patch: { modules: { docker: true } },
    });

    // SETUP.md — docker workflow + compose services
    ops.push({
      kind: "append",
      path: "SETUP.md",
      content: buildDockerSetupSection(composeContent !== null),
    });

    return ops;
  },
};

register(dockerInstaller);

export { dockerInstaller };
