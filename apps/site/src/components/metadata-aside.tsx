import { CHOICES } from "~/lib/choices";
import { SITE_META } from "~/lib/site-meta";

const BUILD_DATE = new Date().toISOString().slice(0, 10);

interface MetadataAsideProps {
  className?: string;
}

export function MetadataAside({ className = "" }: MetadataAsideProps) {
  return (
    <aside
      className={
        "border-t border-rule lg:border-t-0 lg:border-l lg:border-rule px-6 py-10 lg:py-12 space-y-10 " +
        className
      }
    >
      <dl className="space-y-0">
        <MetaRow term="version" value={SITE_META.version} />
        <MetaRow term="license" value={SITE_META.license} />
        <MetaRow term="last-updated" value={BUILD_DATE} last />
      </dl>
      <div className="hidden lg:block space-y-7">
        {CHOICES.slice(0, 2).map((c, i) => (
          <ChoicePreview
            key={c.title}
            num={String(i + 1).padStart(2, "0")}
            text={c.title}
          />
        ))}
      </div>
    </aside>
  );
}

interface MetaRowProps {
  term: string;
  value: string;
  last?: boolean;
}
function MetaRow({ term, value, last }: MetaRowProps) {
  return (
    <div
      className={
        "flex items-baseline justify-between py-3" +
        (last ? "" : " border-b border-rule")
      }
    >
      <dt className="text-label">{term}</dt>
      <dd className="font-mono tabular text-mono-base">{value}</dd>
    </div>
  );
}

interface ChoicePreviewProps {
  num: string;
  text: string;
}
function ChoicePreview({ num, text }: ChoicePreviewProps) {
  return (
    <div>
      <p className="text-body leading-snug">{text}</p>
      <p className="font-mono text-label text-mute mt-1.5">choice {num}</p>
    </div>
  );
}
