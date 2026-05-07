import { useState } from "react";
import { MODULE_ROWS, type ModuleRow } from "~/lib/module-table";
import { Section } from "./section";

export function ModuleTable() {
  return (
    <Section id="modules" num="04" label="modules" sub="table">
      <p className="text-body text-mute max-w-2xl mb-10">
        Eleven modules. Each is file-additive, never edits arbitrary user code.
        Click any row to see what an installer drops in.
      </p>
      <div className="border-t border-rule" role="list">
        {MODULE_ROWS.map((row) => (
          <ModuleRowItem key={row.module} row={row} />
        ))}
      </div>
    </Section>
  );
}

function ModuleRowItem({ row }: { row: ModuleRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div role="listitem" className="border-b border-rule">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`row-${row.module}`}
        className="w-full text-left grid grid-cols-1 md:grid-cols-[140px_minmax(0,1.3fr)_120px_minmax(0,2fr)_24px] gap-x-6 gap-y-1 py-4 px-1 cursor-pointer hover:bg-rule/30 transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <span className="font-mono text-mono-base">{row.module}</span>
        <code className="font-mono text-label text-mute truncate">{row.flag}</code>
        <span className="font-mono text-label text-mute">{row.prereq || "—"}</span>
        <span className="text-body">{row.description}</span>
        <span
          aria-hidden="true"
          className={
            "hidden md:inline font-mono text-label text-mute justify-self-end transition-transform duration-[var(--duration-fast)] " +
            (open ? "rotate-45" : "")
          }
        >
          +
        </span>
      </button>
      <div
        id={`row-${row.module}`}
        className="grid transition-[grid-template-rows] duration-[var(--duration-base)] ease-[var(--ease-out-quart)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pl-1 md:pl-[140px] md:pr-4 pt-1 pb-6">
            <p className="font-mono text-label text-mute mb-3">files added:</p>
            <ul className="space-y-1.5">
              {row.files.map((f) => (
                <li key={f} className="font-mono text-mono-base">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
