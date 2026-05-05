/// <reference types="vite/client" />
import * as React from "react";

/**
 * Provider composer — glob-loads all fragment provider modules from ./fragments/*.tsx
 * and wraps children in them sorted by ascending `order` (lower = outermost wrapper).
 *
 * Phase 03+ drops fragment files into ./fragments/ — this file never changes.
 * When fragments dir is empty, children render unwrapped.
 *
 * Fragment contract:
 *   export default {
 *     Provider: React.ComponentType<{ children: React.ReactNode }>,
 *     order?: number,  // default 50; lower = outer (e.g. i18n=10, query=20)
 *   }
 */

interface FragmentExport {
  Provider: React.ComponentType<{ children: React.ReactNode }>;
  order?: number;
}

function isFragmentExport(m: unknown): m is { default: FragmentExport } {
  if (typeof m !== "object" || m === null) return false;
  const mod = m as Record<string, unknown>;
  if (typeof mod["default"] !== "object" || mod["default"] === null) return false;
  const def = mod["default"] as Record<string, unknown>;
  return typeof def["Provider"] === "function";
}

// Vite glob import — eager so providers are available synchronously at render time
const fragmentModules = import.meta.glob("./fragments/*.tsx", { eager: true });

const providers: Array<React.ComponentType<{ children: React.ReactNode }>> = Object.entries(
  fragmentModules,
)
  .filter(([, m]) => isFragmentExport(m))
  .map(([key, m]) => {
    const mod = (m as { default: FragmentExport }).default;
    return { Provider: mod.Provider, order: mod.order ?? 50, key };
  })
  .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key))
  .map((entry) => entry.Provider);

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return providers.reduceRight<React.ReactNode>(
    (child, Provider) => <Provider>{child}</Provider>,
    children,
  ) as React.ReactElement;
}
