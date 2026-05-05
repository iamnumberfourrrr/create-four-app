/**
 * Idempotency tests — verify that `init with module=true` produces byte-identical
 * output to `init with module=false` followed by `add <module>`.
 *
 * These are end-to-end tests that invoke the built CLI binary.
 * Run `pnpm build` before `pnpm test`.
 *
 * Modules under test are chosen for simplicity (no complex prereqs):
 *   - tailwind: boolean, no prereqs, drops 3 files
 *   - i18n:     boolean, no prereqs, drops config + locale + provider fragment
 *   - zustand:  boolean, no prereqs, drops example store + dep merge
 */

import { describe, test, expect, afterEach } from "vitest";
import { scaffoldProject, addModule } from "./helpers/scaffold.js";
import { treeDiff, normalizeFourJson } from "./helpers/tree-diff.js";
import type { ScaffoldResult } from "./helpers/scaffold.js";

/** Base config shared across all idempotency tests. */
const BASE_CONFIG = {
  projectName: "test-app",
  framework: "tanstack-start" as const,
  modules: {
    tailwind: false,
    shadcn: false,
    i18n: false,
    zustand: false,
    db: false as const,
    worker: false as const,
    auth: [],
    docker: false,
    wrangler: false,
    ci: false,
  },
};

interface TestCase {
  module: string;
  modulePatch: Record<string, unknown>;
}

const MODULES_UNDER_TEST: TestCase[] = [
  {
    module: "tailwind",
    modulePatch: { tailwind: true },
  },
  {
    module: "i18n",
    modulePatch: { i18n: true },
  },
  {
    module: "zustand",
    modulePatch: { zustand: true },
  },
];

describe("idempotency: init-with-module === init-base + add module", () => {
  // Track scaffolds for cleanup even on test failure
  const toCleanup: ScaffoldResult[] = [];

  afterEach(async () => {
    await Promise.all(toCleanup.map((s) => s.cleanup()));
    toCleanup.length = 0;
  });

  for (const { module, modulePatch } of MODULES_UNDER_TEST) {
    test(
      `add ${module}`,
      async () => {
        // dirA: init with module enabled
        const configA = {
          ...BASE_CONFIG,
          modules: { ...BASE_CONFIG.modules, ...modulePatch },
        };
        const scaffoldA = await scaffoldProject(configA);
        toCleanup.push(scaffoldA);

        // dirB: init without module, then add it
        const scaffoldB = await scaffoldProject(BASE_CONFIG);
        toCleanup.push(scaffoldB);
        await addModule(scaffoldB.dir, module);

        // File tree must be byte-identical (excluding .four.json — compared separately)
        const diffs = await treeDiff(scaffoldA.dir, scaffoldB.dir);
        if (diffs.length > 0) {
          const report = diffs
            .map((d) => `  [${d.reason}] ${d.path}`)
            .join("\n");
          throw new Error(
            `Module "${module}" is NOT idempotent — tree diff:\n${report}`,
          );
        }
        expect(diffs).toEqual([]);

        // .four.json must normalise to equivalent state
        const jsonA = await normalizeFourJson(scaffoldA.dir);
        const jsonB = await normalizeFourJson(scaffoldB.dir);
        expect(jsonA).toEqual(jsonB);
      },
      // Generous timeout — CLI runs pnpm build internally; give 60s per module
      60_000,
    );
  }
});
