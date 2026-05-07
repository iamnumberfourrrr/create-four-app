import { CopyButton } from "./copy-button";

const INSTALL_COMMAND = "pnpm dlx create-four-app";
const ALT_COMMAND = "npx create-four-app";

export function Hero() {
  return (
    <section
      id="hero"
      className="px-6 md:px-12 lg:px-16 py-16 md:py-24 lg:py-28 scroll-mt-12"
    >
      <p className="text-headline leading-snug max-w-xl">
        An opinionated CLI that scaffolds a TanStack + Drizzle pnpm monorepo.
        Composable, idempotent.
      </p>
      <div className="mt-12 md:mt-14 flex flex-wrap items-end gap-x-6 gap-y-4">
        <code className="font-mono text-mono-xl leading-none border-b-2 border-accent pb-2">
          {INSTALL_COMMAND}
        </code>
        <div className="mb-2">
          <CopyButton text={INSTALL_COMMAND} label="copy install command" />
        </div>
      </div>
      <p className="mt-7 font-mono text-label text-mute">
        primary action: run command
      </p>
      <p className="mt-6 font-mono text-mono-base text-mute">
        or: <span className="text-ink">{ALT_COMMAND}</span>
      </p>
    </section>
  );
}
