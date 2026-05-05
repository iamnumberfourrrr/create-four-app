import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * i18n installer — react-i18next with browser language detector and lazy locale loading.
 * Drops a provider fragment (order=10 → outermost) so I18nextProvider wraps everything.
 */

const I18N_CONFIG = `import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

/**
 * i18next configuration.
 * Locales are loaded lazily from ./locales/<lng>.json via dynamic import.
 * Add new locales by placing a JSON file in src/i18n/locales/ and updating
 * the supportedLngs list.
 */
const i18n = i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .use({
    type: "backend",
    // Inline lazy backend — avoids i18next-http-backend dependency
    read(
      language: string,
      _namespace: string,
      callback: (err: Error | null, data: Record<string, unknown> | null) => void,
    ) {
      import(\`./locales/\${language}.json\`)
        .then((mod: { default: Record<string, unknown> }) => callback(null, mod.default))
        .catch(() => {
          // Fallback to "en" if locale not found
          import("./locales/en.json")
            .then((mod: { default: Record<string, unknown> }) => callback(null, mod.default))
            .catch((err: unknown) => callback(err instanceof Error ? err : new Error(String(err)), null));
        });
    },
  });

void i18n.init({
  fallbackLng: "en",
  supportedLngs: ["en"],
  interpolation: {
    escapeValue: false, // React already escapes
  },
  detection: {
    order: ["navigator", "htmlTag"],
    caches: [],
  },
});

export default i18n;
`;

const EN_JSON =
  JSON.stringify(
    {
      app: {
        title: "My App",
        description: "Built with create-four-app",
      },
    },
    null,
    2,
  ) + "\n";

const I18N_FRAGMENT = `import * as React from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "~/i18n/config";

/**
 * i18n provider fragment.
 * order=10 → outermost wrapper (runs before query=20, others=50).
 */
function Provider({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export default { Provider, order: 10 };
`;

const i18nInstaller: Installer = {
  name: "i18n",

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    if (!modules["i18n"]) return [];

    const webDir = join("apps", "web");

    return [
      // i18next config with lazy locale loader
      {
        kind: "write",
        path: join(webDir, "src", "i18n", "config.ts"),
        content: I18N_CONFIG,
      },
      // English starter locale
      {
        kind: "write",
        path: join(webDir, "src", "i18n", "locales", "en.json"),
        content: EN_JSON,
      },
      // Provider fragment (order=10 → outermost)
      {
        kind: "write",
        path: join(webDir, "src", "providers", "fragments", "i18n.tsx"),
        content: I18N_FRAGMENT,
      },
      // Patch apps/web/package.json with i18n deps
      {
        kind: "merge-json",
        path: join(webDir, "package.json"),
        patch: {
          dependencies: {
            i18next: "^24.2.3",
            "react-i18next": "^15.5.2",
            "i18next-browser-languagedetector": "^8.0.5",
          },
        },
      },
    ];
  },
};

register(i18nInstaller);

export { i18nInstaller };
