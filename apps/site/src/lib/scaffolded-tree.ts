// Captured tree of a fully-modules-on scaffold. Replace with output of
// `tree --gitignore --noreport` against a real generated project when ready.

export const SCAFFOLDED_TREE = `my-app/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/ui/
│   │   │   │   ├── button.tsx
│   │   │   │   └── input.tsx
│   │   │   ├── i18n/
│   │   │   │   ├── locales/en.json
│   │   │   │   └── index.ts
│   │   │   ├── providers/
│   │   │   │   ├── fragments/
│   │   │   │   │   ├── auth.tsx
│   │   │   │   │   ├── i18n.tsx
│   │   │   │   │   ├── query.tsx
│   │   │   │   │   └── zustand.tsx
│   │   │   │   └── index.tsx
│   │   │   ├── routes/
│   │   │   │   ├── __root.tsx
│   │   │   │   └── index.tsx
│   │   │   ├── server/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── providers/
│   │   │   │   │   │   ├── email-password.ts
│   │   │   │   │   │   └── github.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── hyperdrive.ts
│   │   │   ├── stores/counter.ts
│   │   │   └── styles/globals.css
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── vitest.config.ts
│   └── worker/
│       ├── src/
│       │   ├── jobs/example.ts
│       │   └── index.ts
│       └── package.json
├── packages/
│   ├── config/
│   │   ├── env/
│   │   │   ├── fragments/
│   │   │   │   ├── db.ts
│   │   │   │   └── wrangler.ts
│   │   │   └── index.ts
│   │   └── tsconfig.base.json
│   └── db/
│       ├── src/
│       │   ├── client.ts
│       │   └── schema/
│       │       ├── auth.ts
│       │       └── index.ts
│       ├── drizzle.config.ts
│       └── package.json
├── .github/workflows/ci.yml
├── .four.json
├── Dockerfile
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── wrangler.jsonc`;
