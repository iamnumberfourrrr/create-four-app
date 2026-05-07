import { Section } from "./section";

const SEAMS: { glob: string; describe: string }[] = [
  {
    glob: "packages/db/src/schema/**/*.ts",
    describe: "Drizzle schema files. New auth tables, app tables, anything land here.",
  },
  {
    glob: "packages/config/env/fragments/*.ts",
    describe: "Zod env fragments. Each module drops one; the root config composes them.",
  },
  {
    glob: "apps/web/src/server/auth/providers/*.ts",
    describe: "better-auth providers. Add a file, the runtime picks it up.",
  },
  {
    glob: "apps/web/src/providers/fragments/*.tsx",
    describe: "React context providers, ordered. Lower order = outer wrapper.",
  },
];

export function Seams() {
  return (
    <Section id="seams" num="05" label="seams" sub="composition">
      <p className="text-body text-mute max-w-2xl mb-10 leading-relaxed">
        Installers never edit your code. They drop files into glob patterns the
        runtime reads at startup. Layer modules in any order; the seams resolve.
      </p>
      <dl className="space-y-7 max-w-3xl">
        {SEAMS.map((s) => (
          <div key={s.glob} className="border-b border-rule pb-6 last:border-b-0 last:pb-0">
            <dt>
              <code className="font-mono text-mono-base">{s.glob}</code>
            </dt>
            <dd className="text-body mt-2 leading-relaxed">{s.describe}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
