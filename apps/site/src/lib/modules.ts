export const SIMPLE_MODULE_KEYS = [
  "tailwind",
  "shadcn",
  "i18n",
  "zustand",
  "tanstack-extras",
] as const;

export const OPS_MODULE_KEYS = ["docker", "wrangler", "ci"] as const;

export const AUTH_PROVIDERS = [
  "email-password",
  "github",
  "google",
  "discord",
  "passkeys",
] as const;

export const DB_VARIANTS = ["none", "postgres", "sqlite"] as const;
export const WORKER_VARIANTS = ["none", "pgboss", "sqlite-poll"] as const;

export type SimpleModuleKey = (typeof SIMPLE_MODULE_KEYS)[number];
export type OpsModuleKey = (typeof OPS_MODULE_KEYS)[number];
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];
export type DbVariant = (typeof DB_VARIANTS)[number];
export type WorkerVariant = (typeof WORKER_VARIANTS)[number];

export const MODULE_HINTS: Record<string, string> = {
  shadcn: "requires tailwind",
  worker: "requires db",
  auth: "requires db",
  wrangler: "requires postgres",
};
