import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2.4fr)_minmax(220px,1fr)] border-b border-rule">
      <div className="px-6 py-5 font-mono text-label">create-four-app</div>
      <div className="hidden lg:block" />
      <div className="flex justify-end items-center gap-4 px-6 py-5 font-mono text-label">
        <span className="text-mute">field manual</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
