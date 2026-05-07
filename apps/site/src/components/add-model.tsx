import { Section } from "./section";

const ADD_EXAMPLE = `cd my-app
create-four-app add tailwind
create-four-app add db          # select dialect in prompt
create-four-app add auth        # select providers in prompt`;

export function AddModel() {
  return (
    <Section id="add" num="07" label="add" sub="subcommand">
      <p className="text-body max-w-2xl leading-relaxed">
        Every module is also reachable through{" "}
        <code className="font-mono text-mono-base">add</code>. The CLI walks up
        five directory levels to find{" "}
        <code className="font-mono text-mono-base">.four.json</code>, so you can
        layer modules from anywhere inside the project.
      </p>
      <p className="text-body text-mute max-w-2xl mt-4 leading-relaxed">
        Same installer code as <code className="font-mono">init</code>. Same
        prompts when a module has options. No hidden state.
      </p>
      <pre className="font-mono text-label leading-relaxed border border-rule p-6 mt-10 overflow-x-auto bg-transparent">
        <code>{ADD_EXAMPLE}</code>
      </pre>
    </Section>
  );
}
