import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label: string;
}

export function CopyButton({ text, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className={
        "font-mono text-label uppercase tracking-wide border px-3 py-1.5 transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper " +
        (copied
          ? "border-accent bg-accent text-on-accent"
          : "border-rule text-ink hover:border-ink cursor-pointer")
      }
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}
