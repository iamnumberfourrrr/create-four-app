/**
 * Docker compose generation helpers.
 * Separated from docker.ts to stay under the 200-line file limit.
 *
 * Conditionally assembles docker-compose.yml services based on what
 * infra modules are selected:
 *   - db=postgres / db=mixed-pg → postgres service (mixed-pg: under `pg` profile)
 *   - auth selected            → mailhog service
 *   - db != none/false         → db-migrate one-shot service
 *
 * Returns null when there is nothing to put in compose (no infra needed).
 */

export interface ComposeConfig {
  projectName: string;
  db: string | false;
  hasAuth: boolean;
}

/**
 * Builds a docker-compose.yml string. Returns null when no services are needed.
 */
export function buildComposeContent(cfg: ComposeConfig): string | null {
  const { projectName, db, hasAuth } = cfg;

  const hasPostgres = db === "postgres" || db === "mixed-pg";
  const mixedPgDormant = db === "mixed-pg";
  const hasDb = db && db !== "none" && db !== "sqlite";
  const hasServices = hasPostgres || hasAuth;

  if (!hasServices) return null;

  const lines: string[] = ["services:"];

  // ── Postgres service ────────────────────────────────────────────────────────
  if (hasPostgres) {
    lines.push(`  db:`);
    lines.push(`    image: postgres:16-alpine`);
    lines.push(`    restart: unless-stopped`);
    lines.push(`    environment:`);
    lines.push(`      POSTGRES_DB: ${projectName}`);
    lines.push(`      POSTGRES_USER: postgres`);
    lines.push(`      POSTGRES_PASSWORD: postgres`);
    lines.push(`    ports:`);
    lines.push(`      - "5432:5432"`);
    lines.push(`    volumes:`);
    lines.push(`      - pgdata:/var/lib/postgresql/data`);
    lines.push(`    healthcheck:`);
    lines.push(`      test: ["CMD-SHELL", "pg_isready -U postgres"]`);
    lines.push(`      interval: 2s`);
    lines.push(`      timeout: 5s`);
    lines.push(`      retries: 15`);
    if (mixedPgDormant) {
      lines.push(`    profiles:`);
      lines.push(`      - pg`);
    }
  }

  // ── Mailhog service (when auth selected) ───────────────────────────────────
  if (hasAuth) {
    lines.push(`  mailhog:`);
    lines.push(`    image: mailhog/mailhog:v1.0.1`);
    lines.push(`    restart: unless-stopped`);
    lines.push(`    ports:`);
    lines.push(`      - "1025:1025"`);
    lines.push(`      - "8025:8025"`);
    lines.push(`    healthcheck:`);
    lines.push(
      `      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8025"]`,
    );
    lines.push(`      interval: 5s`);
    lines.push(`      timeout: 5s`);
    lines.push(`      retries: 5`);
  }

  // ── db-migrate one-shot service (when postgres db configured) ──────────────
  if (hasDb) {
    lines.push(`  db-migrate:`);
    lines.push(`    build:`);
    lines.push(`      context: .`);
    lines.push(`      target: migrator`);
    lines.push(`    environment:`);
    lines.push(`      DATABASE_URL: postgres://postgres:postgres@db:5432/${projectName}`);
    lines.push(`    depends_on:`);
    lines.push(`      db:`);
    lines.push(`        condition: service_healthy`);
    lines.push(`    restart: "no"`);
    if (mixedPgDormant) {
      lines.push(`    profiles:`);
      lines.push(`      - pg`);
    }
  }

  // ── Volumes ────────────────────────────────────────────────────────────────
  if (hasPostgres) {
    lines.push(``);
    lines.push(`volumes:`);
    lines.push(`  pgdata:`);
    lines.push(`    driver: local`);
  }

  return lines.join("\n") + "\n";
}
