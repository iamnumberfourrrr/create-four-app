import type { ReactNode } from "react";

interface SectionProps {
  id: string;
  num: string;
  label: string;
  sub: string;
  children: ReactNode;
  contentClassName?: string;
}

export function Section({
  id,
  num,
  label,
  sub,
  children,
  contentClassName = "",
}: SectionProps) {
  return (
    <section
      id={id}
      className="border-t border-rule px-6 md:px-12 lg:px-16 py-16 md:py-20 lg:py-24 scroll-mt-12"
    >
      <header>
        <p className="font-mono text-accent tabular text-base">{num}</p>
        <h2 className="text-headline mt-2">{label}</h2>
        <p className="font-mono text-label text-mute mt-1">{sub}</p>
      </header>
      <div className={"mt-12 lg:mt-14 " + contentClassName}>{children}</div>
    </section>
  );
}
