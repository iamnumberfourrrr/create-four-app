import * as p from "@clack/prompts";
import pc from "picocolors";
import { validateProjectName } from "./validate.js";
import type { FourState } from "../core/state.js";

export const MODULE_ORDER = [
  "framework",
  "tailwind",
  "shadcn",
  "i18n",
  "zustand",
  "tanstack-extras",
  "db",
  "worker",
  "auth",
  "docker",
  "wrangler",
  "ci",
] as const;

export type ModuleKey = (typeof MODULE_ORDER)[number];

export interface WizardAnswers {
  projectName: string;
  framework: "tanstack-start" | "tanstack-router";
  modules: FourState["modules"];
}

function abortIfCancelled<T>(value: T | symbol): asserts value is T {
  if (p.isCancel(value)) {
    p.cancel("Setup cancelled.");
    process.exit(130);
  }
}

export async function runWizard(nameArg?: string): Promise<WizardAnswers> {
  p.intro(pc.bold(pc.cyan("create-four-app")));

  // Project name
  let projectName: string;
  if (nameArg) {
    const err = validateProjectName(nameArg);
    if (err) {
      p.cancel(err.message);
      process.exit(1);
    }
    projectName = nameArg;
  } else {
    const name = await p.text({
      message: "Project name",
      placeholder: "my-app",
      validate(val) {
        const err = validateProjectName(val);
        return err?.message;
      },
    });
    abortIfCancelled(name);
    projectName = name as string;
  }

  // Framework
  const framework = await p.select<"tanstack-start" | "tanstack-router">({
    message: "Framework",
    options: [
      {
        value: "tanstack-start",
        label: "TanStack Start",
        hint: "full-stack SSR",
      },
      { value: "tanstack-router", label: "TanStack Router", hint: "SPA only" },
    ],
  });
  abortIfCancelled(framework);

  // Tailwind
  const tailwind = await p.confirm({
    message: "Add Tailwind CSS v4?",
    initialValue: true,
  });
  abortIfCancelled(tailwind);

  // shadcn — gated on tailwind
  let shadcn = false;
  if (tailwind) {
    const ans = await p.confirm({
      message: "Add shadcn/ui components?",
      initialValue: true,
    });
    abortIfCancelled(ans);
    shadcn = ans as boolean;
  }

  // i18n
  const i18n = await p.confirm({
    message: "Add react-i18next internationalisation?",
    initialValue: false,
  });
  abortIfCancelled(i18n);

  // zustand
  const zustand = await p.confirm({
    message: "Add Zustand global state?",
    initialValue: false,
  });
  abortIfCancelled(zustand);

  // TanStack extras — query is auto-included for Start (no prompt needed for it)
  type TanstackExtra = "query" | "form" | "table" | "virtual" | "store" | "db" | "pacer" | "ranger";
  const tanstackOptions: Array<{ value: TanstackExtra; label: string; hint?: string }> = [
    ...(framework !== "tanstack-start"
      ? [{ value: "query" as const, label: "TanStack Query" }]
      : [{ value: "query" as const, label: "TanStack Query", hint: "auto-included with Start" }]),
    { value: "form", label: "TanStack Form" },
    { value: "table", label: "TanStack Table" },
    { value: "virtual", label: "TanStack Virtual" },
    { value: "store", label: "TanStack Store" },
    { value: "db", label: "TanStack DB" },
    { value: "pacer", label: "TanStack Pacer" },
    { value: "ranger", label: "TanStack Ranger" },
  ];
  const tanstackExtras = await p.multiselect<TanstackExtra>({
    message: "TanStack extras (space to toggle)",
    options: tanstackOptions,
    required: false,
  });
  abortIfCancelled(tanstackExtras);
  let tanstackArr = tanstackExtras as TanstackExtra[];
  // Auto-include query when Start framework selected
  if (framework === "tanstack-start" && !tanstackArr.includes("query")) {
    tanstackArr = ["query", ...tanstackArr];
  }

  // DB
  const db = await p.select<"postgres" | "sqlite" | "none">({
    message: "Database (Drizzle)",
    options: [
      { value: "postgres", label: "PostgreSQL" },
      { value: "sqlite", label: "SQLite (libsql)" },
      { value: "none", label: "None" },
    ],
  });
  abortIfCancelled(db);

  // Worker — gated on db
  let worker: "pgboss" | "sqlite-poll" | false = false;
  if (db !== "none") {
    const workerAns = await p.select<"pgboss" | "sqlite-poll" | "none">({
      message: "Background worker queue",
      options: [
        ...(db === "postgres"
          ? [{ value: "pgboss" as const, label: "pg-boss (PostgreSQL)" }]
          : [{ value: "sqlite-poll" as const, label: "SQLite poll" }]),
        { value: "none", label: "None" },
      ],
    });
    abortIfCancelled(workerAns);
    worker = workerAns === "none" ? false : (workerAns as "pgboss" | "sqlite-poll");
  }

  // Auth — gated on db, hidden when Router (no SSR)
  let auth: string[] = [];
  if (db !== "none" && framework === "tanstack-start") {
    const authAns = await p.multiselect<string>({
      message: "Auth providers (better-auth)",
      options: [
        { value: "email-password", label: "Email + Password" },
        { value: "github", label: "GitHub OAuth" },
        { value: "google", label: "Google OAuth" },
        { value: "discord", label: "Discord OAuth" },
        { value: "passkeys", label: "Passkeys (WebAuthn)" },
      ],
      required: false,
    });
    abortIfCancelled(authAns);
    auth = authAns as string[];
  }

  // Docker
  const docker = await p.confirm({
    message: "Add Docker + dev compose?",
    initialValue: true,
  });
  abortIfCancelled(docker);

  // Wrangler — refused when sqlite
  let wrangler = false;
  if (db !== "sqlite") {
    const wranglerAns = await p.confirm({
      message: "Add Cloudflare Wrangler (Workers/Pages)?",
      initialValue: false,
    });
    abortIfCancelled(wranglerAns);
    wrangler = wranglerAns as boolean;
  }

  // CI
  const ci = await p.confirm({
    message: "Add GitHub Actions CI workflow?",
    initialValue: true,
  });
  abortIfCancelled(ci);

  p.outro(pc.green("Wizard complete. Scaffolding your project..."));

  return {
    projectName,
    framework: framework as "tanstack-start" | "tanstack-router",
    modules: {
      tailwind: Boolean(tailwind),
      shadcn,
      i18n: Boolean(i18n),
      zustand: Boolean(zustand),
      tanstack: {
        query: tanstackArr.includes("query"),
        form: tanstackArr.includes("form"),
        table: tanstackArr.includes("table"),
        virtual: tanstackArr.includes("virtual"),
        store: tanstackArr.includes("store"),
        db: tanstackArr.includes("db"),
        pacer: tanstackArr.includes("pacer"),
        ranger: tanstackArr.includes("ranger"),
      },
      db: db === "none" ? false : db,
      worker,
      auth,
      docker: Boolean(docker),
      wrangler,
      ci: Boolean(ci),
    },
  };
}
