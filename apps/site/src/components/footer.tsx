import { SITE_META } from "~/lib/site-meta";

export function Footer() {
  return (
    <footer className="border-t border-rule px-6 md:px-12 lg:px-16 py-8">
      <div className="font-mono text-label text-mute flex flex-wrap items-center gap-x-4 gap-y-2 max-w-3xl">
        <a
          href={SITE_META.githubUrl}
          className="hover:text-ink transition-colors duration-[var(--duration-fast)]"
        >
          github
        </a>
        <Sep />
        <a
          href={SITE_META.npmUrl}
          className="hover:text-ink transition-colors duration-[var(--duration-fast)]"
        >
          npm
        </a>
        <Sep />
        <span className="tabular">v{SITE_META.version}</span>
        <Sep />
        <a
          href={SITE_META.licenseUrl}
          className="hover:text-ink transition-colors duration-[var(--duration-fast)]"
        >
          {SITE_META.license}
        </a>
      </div>
    </footer>
  );
}

function Sep() {
  return (
    <span aria-hidden="true" className="text-rule">
      ·
    </span>
  );
}
