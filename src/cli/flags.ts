export interface GlobalFlags {
  skipInstall: boolean;
  noRollback: boolean;
  force: boolean;
  inExisting: boolean;
}

export interface InitFlags extends GlobalFlags {
  name?: string;
}

export interface AddFlags extends GlobalFlags {
  module?: string;
}

export const FLAG_DESCRIPTIONS = {
  skipInstall: "Skip running pnpm install after scaffolding",
  noRollback: "Do not remove the project directory on failure",
  force: "Overwrite files in an existing non-empty directory",
  inExisting: "Scaffold into an existing directory without prompting",
} as const;

export function parseGlobalFlags(options: Record<string, unknown>): GlobalFlags {
  return {
    skipInstall: Boolean(options["skip-install"] ?? options["skipInstall"] ?? false),
    noRollback: Boolean(options["no-rollback"] ?? options["noRollback"] ?? false),
    force: Boolean(options["force"] ?? false),
    inExisting: Boolean(options["in-existing"] ?? options["inExisting"] ?? false),
  };
}
