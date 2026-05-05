import type { Installer } from "./installer.js";

const registry = new Map<string, Installer>();

export function register(installer: Installer): void {
  registry.set(installer.name, installer);
}

export function getInstaller(name: string): Installer | undefined {
  return registry.get(name);
}

export function getAllInstallers(): Installer[] {
  return Array.from(registry.values());
}

export function getInstallerNames(): string[] {
  return Array.from(registry.keys());
}

export { registry };
