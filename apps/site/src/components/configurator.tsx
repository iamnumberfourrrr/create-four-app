import { useState } from "react";
import {
  AUTH_PROVIDERS,
  DB_VARIANTS,
  MODULE_HINTS,
  OPS_MODULE_KEYS,
  SIMPLE_MODULE_KEYS,
  WORKER_VARIANTS,
  type AuthProvider,
  type DbVariant,
  type OpsModuleKey,
  type SimpleModuleKey,
  type WorkerVariant,
} from "~/lib/modules";
import {
  INITIAL_CONFIG,
  normalize,
  toConfigJSON,
  toRunCommand,
  type Config,
} from "~/lib/configurator-config";
import { CopyButton } from "./copy-button";
import { Section } from "./section";

export function Configurator() {
  const [config, setConfigRaw] = useState<Config>(INITIAL_CONFIG);

  function update(updater: (prev: Config) => Config) {
    setConfigRaw((prev) => normalize(updater(prev)));
  }

  const json = toConfigJSON(config);
  const command = toRunCommand(config.projectName);

  return (
    <Section id="configure" num="03" label="configure" sub="compose modules">
      <div className="space-y-14 max-w-3xl">
        <ProjectNameField config={config} update={update} />
        <FrameworkField config={config} update={update} />
        <SimpleModuleGroup
          label="core modules"
          keys={SIMPLE_MODULE_KEYS}
          config={config}
          update={update}
        />
        <DbField config={config} update={update} />
        <WorkerField config={config} update={update} />
        <AuthField config={config} update={update} />
        <SimpleModuleGroup
          label="ops modules"
          keys={OPS_MODULE_KEYS}
          config={config}
          update={update}
        />
        <OutputBlock title="config.json" content={json} language="json" />
        <OutputBlock title="command" content={command} language="bash" />
      </div>
    </Section>
  );
}

interface FieldProps {
  config: Config;
  update: (u: (p: Config) => Config) => void;
}

function ProjectNameField({ config, update }: FieldProps) {
  return (
    <FieldShell label="project-name" hint="kebab-case, no spaces">
      <input
        type="text"
        value={config.projectName}
        onChange={(e) =>
          update((p) => ({ ...p, projectName: e.target.value.replace(/\s/g, "-") }))
        }
        className="font-mono text-mono-base bg-transparent border-b border-rule focus:border-accent outline-none px-1 py-1.5 max-w-xs w-full"
        aria-label="project name"
      />
    </FieldShell>
  );
}

function FrameworkField({ config, update }: FieldProps) {
  const frameworks = ["tanstack-start", "tanstack-router"] as const;
  const locked = config.modules.auth.length > 0;
  return (
    <FieldShell label="framework" hint={locked ? "locked: auth requires tanstack-start" : ""}>
      <SegmentedControl
        value={config.framework}
        options={frameworks}
        onChange={(v) => update((p) => ({ ...p, framework: v }))}
        disabled={locked}
      />
    </FieldShell>
  );
}

function DbField({ config, update }: FieldProps) {
  return (
    <FieldShell label="db">
      <SegmentedControl
        value={config.modules.db}
        options={DB_VARIANTS}
        onChange={(v: DbVariant) =>
          update((p) => ({ ...p, modules: { ...p.modules, db: v } }))
        }
      />
    </FieldShell>
  );
}

function WorkerField({ config, update }: FieldProps) {
  return (
    <FieldShell label="worker" hint={MODULE_HINTS.worker}>
      <SegmentedControl
        value={config.modules.worker}
        options={WORKER_VARIANTS}
        onChange={(v: WorkerVariant) =>
          update((p) => ({ ...p, modules: { ...p.modules, worker: v } }))
        }
      />
    </FieldShell>
  );
}

function AuthField({ config, update }: FieldProps) {
  function toggle(provider: AuthProvider) {
    update((p) => {
      const has = p.modules.auth.includes(provider);
      const auth = has ? p.modules.auth.filter((a) => a !== provider) : [...p.modules.auth, provider];
      return { ...p, modules: { ...p.modules, auth } };
    });
  }
  return (
    <FieldShell label="auth providers" hint={MODULE_HINTS.auth}>
      <div className="flex flex-wrap gap-2">
        {AUTH_PROVIDERS.map((p) => (
          <ChipToggle key={p} active={config.modules.auth.includes(p)} onToggle={() => toggle(p)}>
            {p}
          </ChipToggle>
        ))}
      </div>
    </FieldShell>
  );
}

interface SimpleModuleGroupProps {
  label: string;
  keys: readonly (SimpleModuleKey | OpsModuleKey)[];
  config: Config;
  update: (u: (p: Config) => Config) => void;
}
function SimpleModuleGroup({ label, keys, config, update }: SimpleModuleGroupProps) {
  return (
    <FieldShell label={label}>
      <div className="space-y-3">
        {keys.map((k) => (
          <Checkbox
            key={k}
            label={k}
            hint={MODULE_HINTS[k]}
            checked={Boolean(config.modules[k])}
            onChange={(v) =>
              update((p) => ({ ...p, modules: { ...p.modules, [k]: v } }))
            }
          />
        ))}
      </div>
    </FieldShell>
  );
}

interface FieldShellProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}
function FieldShell({ label, hint, children }: FieldShellProps) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <p className="font-mono text-label uppercase tracking-wide">{label}</p>
        {hint ? <p className="font-mono text-label text-mute">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

interface CheckboxProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}
function Checkbox({ label, hint, checked, onChange }: CheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="appearance-none w-4 h-4 border border-rule rounded-none cursor-pointer transition-colors checked:bg-accent checked:border-accent group-hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      />
      <span className="font-mono text-mono-base">{label}</span>
      {hint ? <span className="font-mono text-label text-mute">{hint}</span> : null}
    </label>
  );
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  disabled?: boolean;
}
function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={
              "font-mono text-label uppercase tracking-wide border px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 " +
              (active
                ? "border-accent bg-accent text-on-accent"
                : "border-rule text-ink hover:border-ink") +
              (disabled ? " opacity-50 cursor-not-allowed" : " cursor-pointer")
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

interface ChipToggleProps {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}
function ChipToggle({ active, onToggle, children }: ChipToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        "font-mono text-label tracking-wide border px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer " +
        (active
          ? "border-accent bg-accent text-on-accent"
          : "border-rule text-ink hover:border-ink")
      }
    >
      {children}
    </button>
  );
}

interface OutputBlockProps {
  title: string;
  content: string;
  language: string;
}
function OutputBlock({ title, content, language }: OutputBlockProps) {
  return (
    <div className="border-t border-rule pt-8">
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-mono text-label uppercase tracking-wide">{title}</p>
        <CopyButton text={content} label={`copy ${title}`} />
      </div>
      <pre className="font-mono text-mono-base bg-transparent border border-rule p-4 overflow-x-auto">
        <code className={`language-${language}`}>{content}</code>
      </pre>
    </div>
  );
}
