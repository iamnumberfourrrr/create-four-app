export interface Choice {
  title: string;
  why: string;
}

export const CHOICES: Choice[] = [
  {
    title: "Drizzle, not Prisma.",
    why: "Type-safe SQL with no runtime client. Migrations are plain TypeScript files; the schema is the source of truth.",
  },
  {
    title: "Oxlint, not ESLint.",
    why: "Same rules, written in Rust. About 100× faster on cold starts, no plugin tax, no config bikeshedding.",
  },
  {
    title: "Vitest browser mode, not Jest + jsdom.",
    why: "Tests run in real browsers via Playwright. No emulated DOM, no surprises between CI and production.",
  },
  {
    title: "TanStack Start, not Next.js.",
    why: "Isomorphic loaders, type-safe routing, readable SSR. No framework runtime owns your code.",
  },
  {
    title: "pnpm workspaces, not npm or yarn.",
    why: "Strict isolation, fast installs, content-addressable store. Designed for monorepos from day one.",
  },
];
