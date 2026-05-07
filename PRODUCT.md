# Product

## Register

brand

## Users

Solo indie developers spinning up new side projects, prototypes, and small commercial apps. They:

- Choose their own stack and have strong opinions about it.
- Care about taste and craft. They will read the README before installing.
- Have low tolerance for marketing fluff and generic SaaS-style landing pages.
- Are evaluating `create-four-app` against alternatives like `create-t3-app`, `create-next-app`, and rolling-their-own. The decision happens in the first 30 seconds of looking at the landing page or README.

The job-to-be-done: "I'm starting a new project this weekend. Show me — fast — whether this scaffolder makes the choices I'd already have made, and whether the choices I disagree with can be turned off."

## Product Purpose

`create-four-app` is an opinionated CLI that scaffolds a pnpm monorepo with TanStack Start/Router, Drizzle ORM, Oxlint + Oxfmt, and Vitest browser-mode — fully composable via an `add <module>` subcommand.

The brand surface (landing page, README, npm page, GitHub front page) exists to:

1. Earn the indie dev's trust in under 30 seconds.
2. Make the opinionated choices legible — the *why* behind Drizzle-not-Prisma, Oxlint-not-ESLint, TanStack-not-Next.
3. Show the actual generated artifacts (file tree, prompts, real output) instead of describing them.
4. Reduce friction to the install command. Nothing should stand between an interested dev and `pnpm dlx create-four-app`.

Success looks like: a dev arrives from a tweet or HN comment, scrolls once, runs the install command without scheduling a "let me research this later" tab.

## Brand Personality

Three words: **crafted, restrained, opinionated.**

- **Crafted**: every detail considered. Real type hierarchy, real spacing rhythm, no padding-everywhere monotony. The landing should feel like the same person who chose the stack also designed the page.
- **Restrained**: not loud, not playful, not "fun." No mascot energy. No oversized hero whitespace pretending to be elegance. Confidence through quiet.
- **Opinionated**: name the choices. "Drizzle, not Prisma. Oxlint, not ESLint." Generic adjectives are an admission you have nothing to say.

Voice: declarative, technical, dry. Sentences short. No exclamation marks. No "✨ Effortlessly ✨" copy. Closer to a well-written `man` page than to a marketing site.

## Anti-references

What this should explicitly NOT look like:

1. **The Vercel / charm.sh dev-tool-bro look.** Dotted grid background, neon-on-black terminal, "we made it cool" energy. Saturated as an aesthetic; reads as costume.
2. **The cargo-culted shadcn landing.** Inter + cream background + tasteful drop shadow + three feature cards with lucide icons. Generic SaaS. Indistinguishable from any other 2025 indie launch.
3. **The wall-of-tech-logos hero.** TanStack + Drizzle + Vitest + better-auth as a logo grid pretending to be a value prop. Logos are not value.
4. **The AI-generated landing reflex.** Gradient blob hero, three-column feature grid, "Built for [adjective] developers" headline, em-dash subheading. The category's most overfit pattern.

If the page looks like any of those four, the page has failed.

## Design Principles

Three principles derived from the audience and personality. Every visual and structural choice should pass these:

### 1. Show the thing, not the marketing of the thing

Indie devs want to see the actual generated project, the actual prompts, the actual file tree. Real terminal output, real `tree` output, real `package.json`. Trust artifacts over taglines. If a section can be replaced with a real screenshot of the CLI running, it should be.

### 2. Dense over decorative

Devs read. Reward reading with real content — module table, composition seams, idempotency contract, the `add` subcommand model. Density done right is calm, not cluttered. Oversized hero whitespace is not "elegant"; it is empty. The page should feel like documentation that happens to be beautifully typeset, not marketing that happens to mention features.

### 3. Confidence through specificity

Name the choices. "Drizzle, not Prisma. Oxlint, not ESLint. Vitest browser mode, not Jest + jsdom." A generic claim like "modern tooling" tells the reader you don't know what's modern about it. Specificity is the only way to earn an opinionated dev's trust.

## Accessibility & Inclusion

- WCAG 2.2 AA as the floor across the landing page, README rendering, and any future docs site.
- `prefers-reduced-motion` respected for every animation, transition, or scroll-driven effect. No exceptions.
- All code blocks must be real `<pre><code>` with language hints — never images of code. Screen reader users should be able to read the install command, the config JSON, and the file tree.
- Color contrast checked at OKLCH lightness levels chosen for the palette, not assumed.
- Keyboard navigation works for any interactive element on the landing (copy-to-clipboard buttons, tabs, expandable sections).
- High-contrast mode (Windows / forced-colors) does not break the layout.
