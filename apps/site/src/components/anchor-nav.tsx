import { SECTIONS } from "~/lib/sections";

interface AnchorNavProps {
  className?: string;
}

export function AnchorNav({ className = "" }: AnchorNavProps) {
  return (
    <nav
      aria-label="Sections"
      className={
        "border-t border-rule lg:border-t-0 lg:border-r lg:border-rule lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto px-6 py-10 lg:py-12 " +
        className
      }
    >
      <ol className="space-y-7 md:space-y-9">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="block group">
              <span className="block font-mono text-accent tabular text-base">{s.num}</span>
              <span className="block text-body mt-1.5">{s.label}</span>
              <span className="block font-mono text-label text-mute mt-0.5">{s.sub}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
