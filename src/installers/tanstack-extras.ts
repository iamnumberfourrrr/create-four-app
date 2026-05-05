import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * TanStack extras multi-select installer.
 * Reads ctx.modules.tanstack (object with boolean flags per lib).
 * Each sub-installer drops one or two files — query also drops a provider fragment.
 *
 * Query is auto-included for tanstack-start framework (enforced in prompts.ts + here).
 */

// ── file templates ────────────────────────────────────────────────────────────

const QUERY_CLIENT = `// DELETE ME — example only. Adjust defaultOptions for your app.
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});
`;

const QUERY_FRAGMENT = `import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "~/lib/tanstack/query";

/**
 * TanStack Query provider fragment.
 * order=20 → wraps inside i18n (order=10) but outside everything else.
 */
function Provider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default { Provider, order: 20 };
`;

const FORM_EXAMPLE = `// DELETE ME — example only. See https://tanstack.com/form for full docs.
import { useForm } from "@tanstack/react-form";

/** Example: create a typed form with TanStack Form. */
export function useExampleForm() {
  return useForm({
    defaultValues: {
      name: "",
      email: "",
    },
    onSubmit: async ({ value }) => {
      // Handle form submission
      console.log(value);
    },
  });
}
`;

const TABLE_EXAMPLE = `// DELETE ME — example only. See https://tanstack.com/table for full docs.
import { createColumnHelper } from "@tanstack/react-table";

interface Person {
  id: number;
  name: string;
  email: string;
}

const columnHelper = createColumnHelper<Person>();

/** Example column definitions using TanStack Table's column helper. */
export const personColumns = [
  columnHelper.accessor("id", { header: "ID" }),
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("email", { header: "Email" }),
];
`;

const VIRTUAL_EXAMPLE = `// DELETE ME — example only. See https://tanstack.com/virtual for full docs.
import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";

interface UseExampleVirtualizerOptions {
  count: number;
  parentRef: React.RefObject<HTMLDivElement | null>;
}

/** Example virtualizer for a list with 50px fixed row height. */
export function useExampleVirtualizer({ count, parentRef }: UseExampleVirtualizerOptions) {
  return useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
}
`;

const STORE_EXAMPLE = `// DELETE ME — example only. See https://tanstack.com/store for full docs.
import { Store } from "@tanstack/store";

interface CounterState {
  count: number;
}

/** Example TanStack Store atom. */
export const counterStore = new Store<CounterState>({ count: 0 });

export function incrementCounter() {
  counterStore.setState((prev) => ({ count: prev.count + 1 }));
}
`;

const DB_EXAMPLE = `// DELETE ME — example only. See https://tanstack.com/db for full docs.
import { createCollection } from "@tanstack/db";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

/** Example TanStack DB in-memory collection. */
export const todosCollection = createCollection<Todo>({
  id: "todos",
  getKey: (todo) => todo.id,
});
`;

const PACER_EXAMPLE = `// DELETE ME — example only. See https://tanstack.com/pacer for full docs.
import { debounce } from "@tanstack/pacer";

/**
 * Example: debounce a search handler by 300ms.
 * Usage: const debouncedSearch = createDebouncedSearch(setQuery);
 */
export function createDebouncedSearch(callback: (value: string) => void) {
  return debounce(callback, { wait: 300 });
}
`;

const RANGER_EXAMPLE = `// DELETE ME — example only. See https://tanstack.com/ranger for full docs.
import { useRanger } from "@tanstack/react-ranger";
import * as React from "react";

/** Example: single-thumb range slider returning a controlled ranger instance. */
export function useExampleRanger(initialValue = 50) {
  const [values, setValues] = React.useState<ReadonlyArray<number>>([initialValue]);
  const rangerRef = React.useRef<HTMLDivElement>(null);

  const rangerInstance = useRanger<HTMLDivElement>({
    getRangerElement: () => rangerRef.current,
    values,
    min: 0,
    max: 100,
    stepSize: 1,
    onChange: (instance) => setValues([...instance.value]),
  });

  return { rangerInstance, rangerRef, values };
}
`;

// ── dep maps ─────────────────────────────────────────────────────────────────

type TanstackLib = "query" | "form" | "table" | "virtual" | "store" | "db" | "pacer" | "ranger";

const DEPS: Record<TanstackLib, Record<string, string>> = {
  query: { "@tanstack/react-query": "^5.74.4" },
  form: { "@tanstack/react-form": "^1.14.2" },
  table: { "@tanstack/react-table": "^8.21.3" },
  virtual: { "@tanstack/react-virtual": "^3.13.6" },
  store: { "@tanstack/store": "^0.7.1" },
  db: { "@tanstack/db": "^0.0.1" },
  pacer: { "@tanstack/pacer": "^0.4.2" },
  ranger: { "@tanstack/react-ranger": "^4.1.1" },
};

// ── installer ─────────────────────────────────────────────────────────────────

const tanstackExtrasInstaller: Installer = {
  name: "tanstack-extras",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    const tanstack = modules["tanstack"] as Record<string, boolean> | undefined;
    if (!tanstack) return [];

    // Auto-include query for Start framework regardless of prompt selection
    if (ctx.framework === "tanstack-start") {
      tanstack["query"] = true;
    }

    const webDir = join("apps", "web");
    const libDir = join(webDir, "src", "lib", "tanstack");
    const fragmentsDir = join(webDir, "src", "providers", "fragments");

    const ops: FileOp[] = [];
    const deps: Record<string, string> = {};

    for (const [lib, enabled] of Object.entries(tanstack)) {
      if (!enabled) continue;
      const key = lib as TanstackLib;

      // Accumulate deps
      const libDeps = DEPS[key];
      if (libDeps) {
        Object.assign(deps, libDeps);
      }

      // Drop lib-specific files
      switch (key) {
        case "query":
          ops.push(
            { kind: "write", path: join(libDir, "query.ts"), content: QUERY_CLIENT },
            { kind: "write", path: join(fragmentsDir, "query.tsx"), content: QUERY_FRAGMENT },
          );
          break;
        case "form":
          ops.push({ kind: "write", path: join(libDir, "form.ts"), content: FORM_EXAMPLE });
          break;
        case "table":
          ops.push({ kind: "write", path: join(libDir, "table.ts"), content: TABLE_EXAMPLE });
          break;
        case "virtual":
          ops.push({ kind: "write", path: join(libDir, "virtual.ts"), content: VIRTUAL_EXAMPLE });
          break;
        case "store":
          ops.push({ kind: "write", path: join(libDir, "store.ts"), content: STORE_EXAMPLE });
          // Collision check: zustand + tanstack.store
          if (modules["zustand"] === true) {
            ctx.notes.push(
              "Both @tanstack/store and zustand are selected. " +
                "They overlap in use-case (client-side global state). " +
                "Consider using only one to avoid confusion.",
            );
          }
          break;
        case "db":
          ops.push({ kind: "write", path: join(libDir, "db.ts"), content: DB_EXAMPLE });
          break;
        case "pacer":
          ops.push({ kind: "write", path: join(libDir, "pacer.ts"), content: PACER_EXAMPLE });
          break;
        case "ranger":
          ops.push({ kind: "write", path: join(libDir, "ranger.ts"), content: RANGER_EXAMPLE });
          break;
      }
    }

    if (Object.keys(deps).length > 0) {
      ops.push({
        kind: "merge-json",
        path: join(webDir, "package.json"),
        patch: { dependencies: deps },
      });
    }

    return ops;
  },
};

register(tanstackExtrasInstaller);

export { tanstackExtrasInstaller };
