import { Section } from "./section";

export function Idempotency() {
  return (
    <Section id="idempotency" num="08" label="idempotency" sub="contract">
      <p className="text-headline leading-snug max-w-2xl">
        <code className="font-mono text-mono-base">init(all modules)</code> ===
        <code className="font-mono text-mono-base"> init(base) + add(each module)</code>
      </p>
      <p className="text-body text-mute max-w-2xl mt-6 leading-relaxed">
        The order in which modules are added does not change the resulting tree.
        Verified by the test suite on every commit.
      </p>
    </Section>
  );
}
