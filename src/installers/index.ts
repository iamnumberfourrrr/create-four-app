/**
 * Installer registration barrel.
 * Import order = execution order (base must run first to establish workspace layout).
 * Phase 02: base, config, web-start, web-router, worker
 * Phase 03: tailwind, shadcn, i18n, zustand, tanstack-extras
 * Phase 04: db-shared, db-sqlite, db-mixed-pg, db-postgres, worker-pgboss, worker-sqlite-poll
 * Phase 05: auth
 *
 * db-shared always runs first (drops common scaffold) then the dialect-specific
 * installer fills in drizzle.config.ts, client.ts, and deps.
 *
 * worker-pgboss / worker-sqlite-poll run after the phase-02 "worker" stub and
 * overwrite apps/worker/src/index.ts (overwrite: true) with the real queue impl.
 */
import "./base.js";
import "./config.js";
import "./web-start.js";
import "./web-router.js";
import "./worker.js";
import "./tailwind.js";
import "./shadcn.js";
import "./i18n.js";
import "./zustand.js";
import "./tanstack-extras.js";
import "./db-shared.js";
import "./db-sqlite.js";
import "./db-mixed-pg.js";
import "./db-postgres.js";
import "./worker-pgboss.js";
import "./worker-sqlite-poll.js";
import "./auth.js";
import "./docker.js";
import "./wrangler.js";
import "./ci.js";
// readme must run last — overwrites base README.md with module-aware content
import "./readme.js";
