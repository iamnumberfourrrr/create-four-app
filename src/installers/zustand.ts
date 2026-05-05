import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * Zustand installer.
 * No provider needed — zustand stores are accessed via hooks directly.
 * Drops one example counter store with a DELETE ME header.
 */

const EXAMPLE_STORE = `// DELETE ME — example only. Replace with your own stores.
import { create } from "zustand";

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
`;

const zustandInstaller: Installer = {
  name: "zustand",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    if (!modules["zustand"]) return [];

    const webDir = join("apps", "web");

    // Collision note: if tanstack.store is also selected, warn the user
    const tanstack = modules["tanstack"] as Record<string, unknown> | undefined;
    if (tanstack?.["store"] === true) {
      ctx.notes.push(
        "Both zustand and @tanstack/store are selected. " +
          "They overlap in use-case (client-side global state). " +
          "Consider using only one to avoid confusion.",
      );
    }

    return [
      // Example counter store
      {
        kind: "write",
        path: join(webDir, "src", "stores", "example.store.ts"),
        content: EXAMPLE_STORE,
      },
      // Patch apps/web/package.json with zustand dep
      {
        kind: "merge-json",
        path: join(webDir, "package.json"),
        patch: {
          dependencies: {
            zustand: "^5.0.3",
          },
        },
      },
    ];
  },
};

register(zustandInstaller);

export { zustandInstaller };
