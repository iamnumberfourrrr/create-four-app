import { CHOICES } from "~/lib/choices";
import { Section } from "./section";

export function Choices() {
  return (
    <Section id="choices" num="02" label="choices" sub="declared stack">
      <ol className="space-y-12 lg:space-y-14 max-w-2xl">
        {CHOICES.map((c, i) => (
          <li
            key={c.title}
            className="border-b border-rule pb-12 last:border-b-0 last:pb-0"
          >
            <p className="text-headline leading-tight">{c.title}</p>
            <p className="text-body mt-3 leading-relaxed">{c.why}</p>
            <p className="font-mono text-label text-mute mt-4">
              choice {String(i + 1).padStart(2, "0")}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
