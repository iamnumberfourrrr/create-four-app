export interface InstallerContext {
  projectDir: string;
  projectName: string;
  framework: "tanstack-start" | "tanstack-router";
  modules: Record<string, unknown>; // current .four.json modules
  isAdd: boolean; // true when called from `add` subcommand
  notes: string[]; // side-channel: warnings/notes printed in post-scaffold output (phase 07)
}

export type FileOp =
  | { kind: "write"; path: string; content: string; overwrite?: boolean }
  | { kind: "merge-json"; path: string; patch: object }
  | { kind: "merge-yaml"; path: string; patch: object }
  | { kind: "append"; path: string; content: string }
  | { kind: "mkdir"; path: string };

export interface Installer {
  name: string;
  requires?: string[]; // hard deps; add fails if missing
  conflicts?: string[]; // mutual exclusions
  prompt?: (ctx: InstallerContext) => Promise<unknown>; // sub-config (e.g. auth providers)
  install: (ctx: InstallerContext, config: unknown) => Promise<FileOp[]> | FileOp[];
}
