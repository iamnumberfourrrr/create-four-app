import { SCAFFOLDED_TREE } from "~/lib/scaffolded-tree";
import { Section } from "./section";

export function TreeSection() {
  return (
    <Section id="tree" num="06" label="tree" sub="generated structure">
      <p className="text-body text-mute max-w-2xl mb-10 leading-relaxed">
        What lands on disk after running every module against a fresh project.
        Real output, not a sketch.
      </p>
      <pre className="font-mono text-label leading-relaxed border border-rule p-6 overflow-x-auto bg-transparent">
        <code>{SCAFFOLDED_TREE}</code>
      </pre>
    </Section>
  );
}
