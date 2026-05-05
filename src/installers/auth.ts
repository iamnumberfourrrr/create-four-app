import { join } from "node:path";
import { register } from "../core/registry.js";
import { render } from "../utils/mustache.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * auth installer — better-auth multi-provider setup.
 *
 * Defensive gates:
 *   - framework must be tanstack-start (router has no server)
 *   - db must not be false/none
 *
 * Drops:
 *   - packages/db/src/schema/auth.ts (better-auth standard tables, dialect-aware)
 *   - packages/config/env/fragments/auth.ts (zod fragment, per-provider env keys)
 *   - .env.example (appended auth + provider env keys)
 *   - apps/web/src/server/auth/index.ts (composer + drizzle adapter)
 *   - apps/web/src/server/auth/providers/{email-password,github,google,discord,passkeys}.ts
 *   - apps/web/src/routes/api.auth.$.ts (catch-all server route)
 *   - apps/web/src/lib/auth-client.ts
 *   - apps/web/src/lib/auth-providers.ts (generated constant for button rendering)
 *   - apps/web/src/routes/login.tsx (shadcn/i18n conditional mustache)
 *   - apps/web/src/routes/signup.tsx (shadcn/i18n conditional mustache)
 *   - packages/db/src/seed.ts (dev seed user with production guard)
 *
 * Schema seam: drizzle.config.ts already uses schema: "./src/schema/**\/*.ts"
 * Env seam: packages/config/env/index.ts already globs fragments/*.ts
 */

// ─── Schema fragment ─────────────────────────────────────────────────────────

function buildAuthSchema(db: string): string {
  const isPg = db === "postgres" || db === "mixed-pg";

  if (isPg) {
    return `/**
 * better-auth standard schema — PostgreSQL dialect.
 * Auto-picked by drizzle.config.ts schema glob: src/schema/**
 * Tables: user, session, account, verification
 */
import {
  pgTable,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
`;
  }

  // SQLite
  return `/**
 * better-auth standard schema — SQLite dialect.
 * Auto-picked by drizzle.config.ts schema glob: src/schema/**
 * Tables: user, session, account, verification
 */
import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
`;
}

// ─── Env fragment ─────────────────────────────────────────────────────────────

function buildAuthEnvFragment(providers: string[]): string {
  const providerLines: string[] = [];

  if (providers.includes("github")) {
    providerLines.push(
      `  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),`,
      `  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),`,
    );
  }
  if (providers.includes("google")) {
    providerLines.push(
      `  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),`,
      `  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),`,
    );
  }
  if (providers.includes("discord")) {
    providerLines.push(
      `  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),`,
      `  DISCORD_CLIENT_SECRET: z.string().min(1, "DISCORD_CLIENT_SECRET is required"),`,
    );
  }

  const providerBlock = providerLines.length > 0 ? "\n" + providerLines.join("\n") : "";

  return `import { z } from "zod";

/**
 * Auth env fragment — composed automatically by packages/config/env/index.ts glob.
 * AUTH_SECRET must be at least 32 characters (use: openssl rand -base64 32).
 */
export const schema = z.object({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),${providerBlock}
});
`;
}

// ─── .env.example content ─────────────────────────────────────────────────────

function buildEnvExampleAppend(providers: string[]): string {
  const lines: string[] = ["", "# Auth (better-auth)", "AUTH_SECRET="];

  if (providers.includes("github")) {
    lines.push("", "# GitHub OAuth");
    lines.push("GITHUB_CLIENT_ID=");
    lines.push("GITHUB_CLIENT_SECRET=");
  }
  if (providers.includes("google")) {
    lines.push("", "# Google OAuth");
    lines.push("GOOGLE_CLIENT_ID=");
    lines.push("GOOGLE_CLIENT_SECRET=");
  }
  if (providers.includes("discord")) {
    lines.push("", "# Discord OAuth");
    lines.push("DISCORD_CLIENT_ID=");
    lines.push("DISCORD_CLIENT_SECRET=");
  }

  return lines.join("\n") + "\n";
}

// ─── Server: auth/index.ts ────────────────────────────────────────────────────

function buildAuthIndex(projectName: string, db: string): string {
  const isPg = db === "postgres" || db === "mixed-pg";
  const provider = isPg ? "pg" : "sqlite";

  return `/**
 * better-auth server instance.
 *
 * Provider files in ./providers/*.ts are glob-imported and merged into the
 * betterAuth() config automatically — drop a new file to add a provider.
 *
 * Drizzle adapter uses provider="${provider}" (dialect-aware).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@${projectName}/db";
import { env } from "@${projectName}/config/env";

// Glob-import all provider config fragments eagerly
const providerMods = import.meta.glob("./providers/*.ts", { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;
const providerConfigs = Object.values(providerMods).map((m) => m.default);

// Merge all provider fragments into a single config object
function mergeProviderConfigs(
  configs: Array<Record<string, unknown>>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const cfg of configs) {
    for (const [key, val] of Object.entries(cfg)) {
      if (
        val !== null &&
        typeof val === "object" &&
        !Array.isArray(val) &&
        typeof merged[key] === "object" &&
        merged[key] !== null &&
        !Array.isArray(merged[key])
      ) {
        merged[key] = {
          ...(merged[key] as Record<string, unknown>),
          ...(val as Record<string, unknown>),
        };
      } else {
        merged[key] = val;
      }
    }
  }
  return merged;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "${provider}" }),
  secret: env.AUTH_SECRET,
  ...mergeProviderConfigs(providerConfigs),
});

export type Auth = typeof auth;
`;
}

// ─── Provider files ───────────────────────────────────────────────────────────

const EMAIL_PASSWORD_PROVIDER = `/**
 * email-password provider fragment for better-auth.
 * Exported default is merged into betterAuth() config by server/auth/index.ts.
 */
export default {
  emailAndPassword: {
    enabled: true,
  },
} satisfies Record<string, unknown>;
`;

const GITHUB_PROVIDER = `/**
 * GitHub OAuth provider fragment for better-auth.
 * Requires: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET in environment.
 */
import { env } from "~/server/env";

export default {
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
} satisfies Record<string, unknown>;
`;

const GOOGLE_PROVIDER = `/**
 * Google OAuth provider fragment for better-auth.
 * Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET in environment.
 */
import { env } from "~/server/env";

export default {
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
} satisfies Record<string, unknown>;
`;

const DISCORD_PROVIDER = `/**
 * Discord OAuth provider fragment for better-auth.
 * Requires: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET in environment.
 */
import { env } from "~/server/env";

export default {
  socialProviders: {
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    },
  },
} satisfies Record<string, unknown>;
`;

const PASSKEYS_PROVIDER = `/**
 * Passkeys (WebAuthn) provider fragment for better-auth.
 *
 * Local dev note: WebAuthn requires HTTPS or localhost.
 * For testing locally, enable: chrome://flags/#enable-webauthn-virtual-authenticators
 */
import { passkey } from "better-auth/plugins";

export default {
  plugins: [passkey()],
} satisfies Record<string, unknown>;
`;

// ─── Server env re-export ─────────────────────────────────────────────────────

function buildServerEnvReexport(projectName: string): string {
  return `/**
 * Server-side env re-export for server functions and API routes.
 * Do NOT import this in client-side code.
 */
export { env } from "@${projectName}/config/env";
`;
}

// ─── Route catch-all ──────────────────────────────────────────────────────────

const AUTH_CATCH_ALL_ROUTE = `/**
 * TanStack Start server route — mounts better-auth handler.
 * Handles all requests at /api/auth/* (sessions, OAuth callbacks, etc.)
 */
import { createServerFileRoute } from "@tanstack/react-start/server";
import { auth } from "~/server/auth";

export const ServerRoute = createServerFileRoute("/api/auth/$").methods({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
});
`;

// ─── Auth client ──────────────────────────────────────────────────────────────

function buildAuthClient(providers: string[]): string {
  const hasPasskeys = providers.includes("passkeys");

  if (hasPasskeys) {
    return `/**
 * better-auth React client.
 * Includes passkeyClient plugin because passkeys were selected.
 */
import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [passkeyClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
`;
  }

  return `/**
 * better-auth React client.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
`;
}

// ─── Auth providers constant ──────────────────────────────────────────────────

function buildAuthProviders(providers: string[]): string {
  type ProviderEntry = {
    id: string;
    label: string;
    icon: string;
  };

  const providerMap: Record<string, ProviderEntry> = {
    github: { id: "github", label: "GitHub", icon: "Github" },
    google: { id: "google", label: "Google", icon: "Globe" },
    discord: { id: "discord", label: "Discord", icon: "MessageSquare" },
    passkeys: { id: "passkey", label: "Passkey", icon: "Key" },
  };

  const socialProviders = providers
    .filter((p) => p !== "email-password")
    .map((p) => providerMap[p])
    .filter((p): p is ProviderEntry => p !== undefined);

  const lucideIcons = [...new Set(socialProviders.map((p) => p.icon))];
  const iconImport =
    lucideIcons.length > 0 ? `import { ${lucideIcons.join(", ")} } from "lucide-react";\n` : "";

  const providerEntries = socialProviders
    .map((p) => `  { id: "${p.id}" as const, label: "${p.label}", Icon: ${p.icon} }`)
    .join(",\n");

  return `/**
 * Generated by auth installer — DO NOT EDIT MANUALLY.
 * Lists social auth providers selected at scaffold time.
 * Used by login.tsx to render sign-in buttons.
 */
${iconImport}
export const AUTH_SOCIAL_PROVIDERS = [
${providerEntries}
] as const;

export type SocialProviderId = (typeof AUTH_SOCIAL_PROVIDERS)[number]["id"];
`;
}

// ─── Login page ───────────────────────────────────────────────────────────────

const LOGIN_TEMPLATE = `{{#shadcn}}import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
{{/shadcn}}{{#i18n}}import { useTranslation } from "react-i18next";
{{/i18n}}import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useState } from "react";
import { authClient } from "~/lib/auth-client";
import { AUTH_SOCIAL_PROVIDERS } from "~/lib/auth-providers";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute() {
  {{#i18n}}const { t } = useTranslation();
  {{/i18n}}const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Sign in failed");
      } else {
        await router.navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialSignIn(provider: string) {
    await authClient.signIn.social({ provider, callbackURL: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <h1 className="text-2xl font-bold text-center">
          {{#i18n}}{t("login.title")}{{/i18n}}{{^i18n}}Sign in{{/i18n}}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {{#shadcn}}<Input
            type="email"
            name="email"
            placeholder={{#i18n}}{t("login.email")}{{/i18n}}{{^i18n}}"Email"{{/i18n}}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            name="password"
            placeholder={{#i18n}}{t("login.password")}{{/i18n}}{{^i18n}}"Password"{{/i18n}}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />{{/shadcn}}{{^shadcn}}<input
            type="email"
            name="email"
            placeholder={{#i18n}}{t("login.email")}{{/i18n}}{{^i18n}}"Email"{{/i18n}}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            name="password"
            placeholder={{#i18n}}{t("login.password")}{{/i18n}}{{^i18n}}"Password"{{/i18n}}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />{{/shadcn}}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {{#shadcn}}<Button type="submit" className="w-full" disabled={loading}>
            <Mail className="mr-2 h-4 w-4" />
            {{#i18n}}{t("login.submit")}{{/i18n}}{{^i18n}}Sign in{{/i18n}}
          </Button>{{/shadcn}}{{^shadcn}}<button type="submit" disabled={loading}>
            <Mail className="mr-2 h-4 w-4" />
            {{#i18n}}{t("login.submit")}{{/i18n}}{{^i18n}}Sign in{{/i18n}}
          </button>{{/shadcn}}
        </form>

        {AUTH_SOCIAL_PROVIDERS.length > 0 && (
          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">
              {{#i18n}}{t("login.or")}{{/i18n}}{{^i18n}}or{{/i18n}}
            </p>
            {AUTH_SOCIAL_PROVIDERS.map(({ id, label, Icon }) => (
              {{#shadcn}}<Button
                key={id}
                variant="outline"
                className="w-full"
                onClick={() => handleSocialSignIn(id)}
                type="button"
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Button>{{/shadcn}}{{^shadcn}}<button
                key={id}
                onClick={() => handleSocialSignIn(id)}
                type="button"
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </button>{{/shadcn}}
            ))}
          </div>
        )}

        <p className="text-center text-sm">
          {{#i18n}}{t("signup.noAccount")} {{/i18n}}{{^i18n}}No account? {{/i18n}}
          <a href="/signup" className="underline">
            {{#i18n}}{t("signup.link")}{{/i18n}}{{^i18n}}Sign up{{/i18n}}
          </a>
        </p>
      </div>
    </div>
  );
}
`;

// ─── Signup page ──────────────────────────────────────────────────────────────

const SIGNUP_TEMPLATE = `{{#shadcn}}import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
{{/shadcn}}{{#i18n}}import { useTranslation } from "react-i18next";
{{/i18n}}import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useState } from "react";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/signup")({
  component: SignupRoute,
});

function SignupRoute() {
  {{#i18n}}const { t } = useTranslation();
  {{/i18n}}const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) {
        setError(result.error.message ?? "Sign up failed");
      } else {
        await router.navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <h1 className="text-2xl font-bold text-center">
          {{#i18n}}{t("signup.title")}{{/i18n}}{{^i18n}}Create account{{/i18n}}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {{#shadcn}}<Input
            type="text"
            name="name"
            placeholder={{#i18n}}{t("signup.name")}{{/i18n}}{{^i18n}}"Name"{{/i18n}}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="email"
            name="email"
            placeholder={{#i18n}}{t("login.email")}{{/i18n}}{{^i18n}}"Email"{{/i18n}}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            name="password"
            placeholder={{#i18n}}{t("login.password")}{{/i18n}}{{^i18n}}"Password"{{/i18n}}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />{{/shadcn}}{{^shadcn}}<input
            type="text"
            name="name"
            placeholder={{#i18n}}{t("signup.name")}{{/i18n}}{{^i18n}}"Name"{{/i18n}}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            name="email"
            placeholder={{#i18n}}{t("login.email")}{{/i18n}}{{^i18n}}"Email"{{/i18n}}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            name="password"
            placeholder={{#i18n}}{t("login.password")}{{/i18n}}{{^i18n}}"Password"{{/i18n}}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />{{/shadcn}}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {{#shadcn}}<Button type="submit" className="w-full" disabled={loading}>
            <Mail className="mr-2 h-4 w-4" />
            {{#i18n}}{t("signup.submit")}{{/i18n}}{{^i18n}}Sign up{{/i18n}}
          </Button>{{/shadcn}}{{^shadcn}}<button type="submit" disabled={loading}>
            <Mail className="mr-2 h-4 w-4" />
            {{#i18n}}{t("signup.submit")}{{/i18n}}{{^i18n}}Sign up{{/i18n}}
          </button>{{/shadcn}}
        </form>

        <p className="text-center text-sm">
          {{#i18n}}{t("login.haveAccount")} {{/i18n}}{{^i18n}}Have an account? {{/i18n}}
          <a href="/login" className="underline">
            {{#i18n}}{t("login.link")}{{/i18n}}{{^i18n}}Sign in{{/i18n}}
          </a>
        </p>
      </div>
    </div>
  );
}
`;

// ─── Seed file ────────────────────────────────────────────────────────────────

function buildSeedFile(projectName: string, db: string): string {
  const isPg = db === "postgres" || db === "mixed-pg";
  const dbImport = isPg
    ? `import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";`
    : `import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";`;

  const dbSetup = isPg
    ? `const pool = new Pool({ connectionString: process.env["DATABASE_URL"] ?? "" });
const db = drizzle(pool);`
    : `const client = createClient({ url: process.env["DATABASE_URL"] ?? "file:./local.db" });
const db = drizzle(client);`;

  const cleanup = isPg ? `await pool.end();` : `client.close();`;

  return `/**
 * Dev seed — creates dev@local / password user for local development.
 *
 * NEVER runs in production (NODE_ENV guard).
 * Run: pnpm db:seed
 */
import { hashPassword } from "better-auth/crypto";
import { nanoid } from "nanoid";
${dbImport}
import * as schema from "./src/schema/auth.js";

if (process.env["NODE_ENV"] === "production") {
  console.error("Refusing to seed in production");
  process.exit(1);
}

${dbSetup}

const now = new Date();
const userId = nanoid();

await db.insert(schema.user).values({
  id: userId,
  name: "Dev User",
  email: "dev@local",
  emailVerified: true,
  createdAt: now,
  updatedAt: now,
});

const hashed = await hashPassword("password");

await db.insert(schema.account).values({
  id: nanoid(),
  userId,
  accountId: "dev@local",
  providerId: "credential",
  password: hashed,
  createdAt: now,
  updatedAt: now,
});

${cleanup}

console.log("Seeded dev@local / password");
`;
}

// ─── i18n keys ────────────────────────────────────────────────────────────────

const I18N_AUTH_KEYS = {
  login: {
    title: "Sign in",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    or: "or",
    haveAccount: "Have an account?",
    link: "Sign in",
  },
  signup: {
    title: "Create account",
    name: "Name",
    submit: "Sign up",
    noAccount: "No account?",
    link: "Sign up",
  },
};

// ─── Installer ────────────────────────────────────────────────────────────────

const authInstaller: Installer = {
  name: "auth",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    const authProviders = modules["auth"];

    // Skip if auth not selected
    if (!authProviders || !Array.isArray(authProviders) || authProviders.length === 0) {
      return [];
    }

    // Defensive gates
    if (ctx.framework !== "tanstack-start") {
      throw new Error(
        "auth installer requires framework=tanstack-start. " +
          "TanStack Router (SPA) has no server-side handler for better-auth.",
      );
    }

    const db = modules["db"];
    if (!db || db === false) {
      throw new Error(
        "auth installer requires a database (db must not be 'none'). " +
          "Select a db option before adding auth.",
      );
    }

    const providers = authProviders as string[];
    const dbValue = db as string;
    const hasShadcn = Boolean(modules["shadcn"]);
    const hasI18n = Boolean(modules["i18n"]);
    const projectName = ctx.projectName;

    const webDir = join("apps", "web");
    const dbPkg = join("packages", "db");
    const providerDir = join(webDir, "src", "server", "auth", "providers");

    const mustacheVars: Record<string, unknown> = {
      shadcn: hasShadcn,
      i18n: hasI18n,
    };

    const ops: FileOp[] = [
      // ── Schema fragment (auto-picked by drizzle glob) ──────────────────
      {
        kind: "write",
        path: join(dbPkg, "src", "schema", "auth.ts"),
        content: buildAuthSchema(dbValue),
      },

      // ── Env fragment (auto-picked by config glob) ──────────────────────
      {
        kind: "write",
        path: join("packages", "config", "env", "fragments", "auth.ts"),
        content: buildAuthEnvFragment(providers),
      },

      // ── .env.example append ────────────────────────────────────────────
      {
        kind: "append",
        path: ".env.example",
        content: buildEnvExampleAppend(providers),
      },

      // ── Server auth composer ───────────────────────────────────────────
      {
        kind: "write",
        path: join(webDir, "src", "server", "auth", "index.ts"),
        content: buildAuthIndex(projectName, dbValue),
      },

      // ── Server env re-export (if not already dropped by db installer) ──
      {
        kind: "write",
        path: join(webDir, "src", "server", "env.ts"),
        content: buildServerEnvReexport(projectName),
      },

      // ── API route catch-all ────────────────────────────────────────────
      {
        kind: "write",
        path: join(webDir, "src", "routes", "api.auth.$.ts"),
        content: AUTH_CATCH_ALL_ROUTE,
      },

      // ── Auth client ────────────────────────────────────────────────────
      {
        kind: "write",
        path: join(webDir, "src", "lib", "auth-client.ts"),
        content: buildAuthClient(providers),
      },

      // ── Generated providers constant ───────────────────────────────────
      {
        kind: "write",
        path: join(webDir, "src", "lib", "auth-providers.ts"),
        content: buildAuthProviders(providers),
      },

      // ── Login page (mustache conditional on shadcn + i18n) ─────────────
      {
        kind: "write",
        path: join(webDir, "src", "routes", "login.tsx"),
        content: render(LOGIN_TEMPLATE, mustacheVars),
      },

      // ── Signup page (mustache conditional on shadcn + i18n) ────────────
      {
        kind: "write",
        path: join(webDir, "src", "routes", "signup.tsx"),
        content: render(SIGNUP_TEMPLATE, mustacheVars),
      },

      // ── Seed file + db:seed script ─────────────────────────────────────
      {
        kind: "write",
        path: join(dbPkg, "src", "seed.ts"),
        content: buildSeedFile(projectName, dbValue),
      },

      // db:seed script in packages/db/package.json
      {
        kind: "merge-json",
        path: join(dbPkg, "package.json"),
        patch: {
          scripts: {
            "db:seed": "tsx src/seed.ts",
          },
          devDependencies: {
            tsx: "^4.19.4",
            nanoid: "^5.1.5",
          },
        },
      },

      // Root shortcut
      {
        kind: "merge-json",
        path: "package.json",
        patch: {
          scripts: {
            "db:seed": "pnpm --filter db db:seed",
          },
        },
      },

      // better-auth dep in apps/web
      {
        kind: "merge-json",
        path: join(webDir, "package.json"),
        patch: {
          dependencies: {
            "better-auth": "^1.2.8",
          },
        },
      },

      // nanoid for seed (also needed in db package)
      {
        kind: "merge-json",
        path: join(dbPkg, "package.json"),
        patch: {
          dependencies: {
            nanoid: "^5.1.5",
          },
        },
      },
    ];

    // ── Per-provider files ───────────────────────────────────────────────
    if (providers.includes("email-password")) {
      ops.push({
        kind: "write",
        path: join(providerDir, "email-password.ts"),
        content: EMAIL_PASSWORD_PROVIDER,
      });
    }

    if (providers.includes("github")) {
      ops.push({
        kind: "write",
        path: join(providerDir, "github.ts"),
        content: GITHUB_PROVIDER,
      });
    }

    if (providers.includes("google")) {
      ops.push({
        kind: "write",
        path: join(providerDir, "google.ts"),
        content: GOOGLE_PROVIDER,
      });
    }

    if (providers.includes("discord")) {
      ops.push({
        kind: "write",
        path: join(providerDir, "discord.ts"),
        content: DISCORD_PROVIDER,
      });
    }

    if (providers.includes("passkeys")) {
      ops.push({
        kind: "write",
        path: join(providerDir, "passkeys.ts"),
        content: PASSKEYS_PROVIDER,
      });
    }

    // ── i18n keys (only when i18n installed) ─────────────────────────────
    if (hasI18n) {
      ops.push({
        kind: "merge-json",
        path: join(webDir, "src", "i18n", "locales", "en.json"),
        patch: I18N_AUTH_KEYS,
      });
    }

    // ── .four.json update (auth providers list) ───────────────────────────
    ops.push({
      kind: "merge-json",
      path: ".four.json",
      patch: {
        modules: {
          auth: providers,
        },
      },
    });

    return ops;
  },
};

register(authInstaller);

export { authInstaller };
