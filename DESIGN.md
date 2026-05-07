<!-- SEED: re-run /impeccable document once the landing page exists, to capture the actual tokens, fonts, and components. -->

---
name: create-four-app
description: Opinionated CLI scaffolder for TanStack + Drizzle + Oxlint pnpm monorepos
---

# Design System: create-four-app

## 1. Overview

**Creative North Star: "The Field Manual"**

A field manual is dense, declarative, beautifully typeset, and trusted because it is precise. It does not market its own contents; the contents earn the trust. The landing for `create-four-app` should feel like that — a single, generous, technical document where the *thing being documented* is the only ornament, and the type, color, and rhythm exist in service of getting an indie developer from "what is this?" to "I'm typing the install command" without a single moment of marketing-speak in between.

The aesthetic family is the indie-Mac-app brochure lane: Working Copy, Tot, Soulver. These pages take small functional tools seriously, treat the reader as a peer, and let real screenshots, real typography, and real density carry the weight that other landings dump onto hero copy and gradient blobs. The visual mood is restrained, technical, quietly confident. Color is rationed. Motion is responsive, never theatrical. Layout breathes where it must and packs where it should — never the same padding everywhere.

What this system explicitly rejects: the dev-tool-bro costume (dotted grids, neon-on-black terminals, "we made it cool"); the cargo-culted shadcn landing (Inter + cream + tasteful drop shadow + three feature cards); the wall-of-tech-logos hero pretending logos are value; the AI-generated-landing reflex (gradient blob + 3-column grid + adjective headline). Specifically not `create-t3-app`'s landing, not `daisyUI`'s mascot-illustrative loudness, not `Astro`'s dark-space-gradient rebrand.

**Key Characteristics:**

- Editorial density, not marketing whitespace
- One accent color, used like punctuation
- Real screenshots and real `tree` output as the primary illustration
- Type hierarchy doing work that color usually does on lesser pages
- Motion as feedback, never as choreography

## 2. Colors

The palette is **Restrained**: tinted neutrals carry the surface, one electric-green accent appears on under 10% of any given screen, and that's it. No secondary color, no tertiary. Black and white are forbidden — every neutral is tinted toward the accent's hue family.

### Primary

- **Electric Green (Daylight)** `[oklch to be resolved during implementation]`: the single accent. Used for the install command, link underlines, focus rings, the one-or-two punctuated emphases per screen. Critically, this is *not* terminal phosphor `#00ff41`, *not* matrix-screen green, *not* charm.sh teal. The intent is a bright, daylit, yellow-leaning electric green — the green of a highlighter on a printed page, not the green of a CRT. Aim for high chroma at ~80–85% lightness so it reads as a *signal*, not a costume.

### Neutral

- **Ink** `[oklch to be resolved]`: the body text and primary surface contrast. Near-black, but tinted with a trace of the accent hue (`chroma 0.005–0.01`). Never `#000`.
- **Paper** `[oklch to be resolved]`: the page background. A warm-leaning off-white, also faintly tinted toward the accent's hue family. Never `#fff`.
- **Rule** `[oklch to be resolved]`: dividers, table borders, code-block borders. A muted mid-tone derived from Ink, low chroma.
- **Mute** `[oklch to be resolved]`: secondary text, captions, code comments. Lighter than Ink, still tinted.

### Named Rules

**The Punctuation Rule.** The accent color is used like a period or em dash — sparingly and only where the eye must stop. ≤10% of any rendered viewport. If a section has more than two electric-green elements, one of them is wrong.

**The No-Pure-Black-Or-White Rule.** Every "black" and "white" carries chroma tinted toward the accent hue. Pure `#000` and `#fff` are forbidden across the entire surface. This rule is non-negotiable.

**The Costume Test.** If the color treatment looks like it was chosen because the product is a CLI ("oh, devs like green-on-black"), the treatment has failed. The accent is a *signal*, not a uniform.

## 3. Typography

**Display Font:** `[single sans, technical-feel — to be chosen at implementation. Lane: Söhne, Söhne Breit, Untitled Sans, Inter Display, ABC Diatype, Founders Grotesk]`
**Body Font:** Same family as Display, lighter weight. The whole system runs on one type family.
**Mono Font:** `[paired mono — to be chosen. Lane: Söhne Mono, JetBrains Mono, IBM Plex Mono, Berkeley Mono]`

**Character:** A single technical-grade sans does the work of headlines, body, and labels — separated by weight, size, and tracking, not by a second family. The mono is reserved for code, file paths, command-line output, and version numbers. Two voices, total.

### Hierarchy

- **Display** (weight 500–600, `clamp(2.5rem, 6vw, 4.5rem)`, line-height 1.0–1.05, slight negative tracking): hero headline only. One per page.
- **Headline** (weight 500, `clamp(1.75rem, 3.5vw, 2.25rem)`, line-height 1.1): section openers.
- **Title** (weight 500, ~1.25rem, line-height 1.25): subsection labels, card titles.
- **Body** (weight 400, 1rem, line-height 1.55, **65–75ch max line length**): all prose.
- **Label** (weight 500, 0.8125rem, letter-spacing `0.04em`, **uppercase**): metadata, table headers, version/badge text. Used sparingly.
- **Mono** (weight 400, 0.9375rem, line-height 1.6): code blocks, inline `kbd`, file paths, terminal output.

### Named Rules

**The One Voice Rule.** One sans family across the entire system. Hierarchy is achieved through scale and weight, never by introducing a second sans.

**The 1.25× Step Rule.** Each step in the type scale is at least 1.25× the previous step. Flat scales are monotony; this is a field manual, not a wall of equal-sized labels.

**The Real Code Rule.** All code is real `<pre><code>` with a language hint. Never an image of code. Never a `<div>` masquerading as a code block. The reader can copy any command, in any block, with the keyboard.

## 4. Elevation

The system is **flat by default**. The page reads as a single sheet of paper — depth comes from typography, color contrast, and rule lines, not from layered shadows. Shadows appear only as state response (hover on the install-command callout, focus on a copy button), never as ambient decoration.

Motion is **Responsive**: state changes, transitions, copy-to-clipboard feedback, focus shifts. No orchestrated scroll sequences, no animated entrances, no parallax. `prefers-reduced-motion` is respected for every transition.

### Shadow Vocabulary

- **State-Response** (`box-shadow: 0 1px 2px [Ink at low alpha]`): a barely-there ground shadow used only when an interactive element is hovered or focused. Returns to flat on rest.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear *only* as a response to state. A static screenshot of the page should look like a single sheet, not a stack of cards.

**The No-Glassmorphism Rule.** No backdrop blur. No translucent layered panes. No "frosted" anything. The accent's job is to do the work that glassmorphism is usually deployed to fake.

## 5. Components

Omitted — no components exist yet. Re-run `/impeccable document` once the landing page is implemented to capture the real button, code-block, install-command, and module-table primitives.

## 6. Do's and Don'ts

The Don'ts carry the strategic line from PRODUCT.md verbatim. If a single rendered viewport violates any of these, the page has failed.

### Do:

- **Do** treat the install command (`pnpm dlx create-four-app`) as the page's most important visual element. It deserves the largest single block of mono, a one-keystroke copy affordance, and the accent as punctuation.
- **Do** use real `tree` output, real `package.json`, real terminal screenshots as the primary illustrations. The artifacts are the marketing.
- **Do** vary spacing for rhythm — generous around the hero and the install command; dense in the module table, the composition seams, the idempotency contract. Same padding everywhere is monotony.
- **Do** anchor every claim to a specific choice ("Drizzle, not Prisma. Oxlint, not ESLint."). If the page contains the word "modern" without naming what's modern about it, delete the sentence.
- **Do** cap body text at 65–75ch. Devs read; long lines break the reading rhythm.
- **Do** tint every neutral toward the electric-green hue family at chroma 0.005–0.01. The page should feel ever-so-slightly warm-green-leaning even where no green is visible.
- **Do** respect `prefers-reduced-motion` for all transitions. No exceptions.

### Don't:

- **Don't** use a dotted grid background, a neon-on-black terminal, or any "dev-tool-bro" costume. Specifically: not the **Vercel / charm.sh look**.
- **Don't** ship the **cargo-culted shadcn landing** — Inter + cream + drop-shadow + three feature cards with lucide icons. If the page is indistinguishable from any other 2025 indie launch, rewrite it.
- **Don't** build a **wall-of-tech-logos** hero. TanStack / Drizzle / Vitest / better-auth as a logo grid pretending to be a value prop is forbidden. Logos are not value.
- **Don't** ship the **AI-generated-landing reflex**: gradient blob hero + three-column feature grid + "Built for [adjective] developers" headline + em-dash subheading. This is the category's most overfit pattern.
- **Don't** look like **`create-t3-app`'s landing** — it's the closest competitor; the page must be visibly its own thing the moment a comparison happens.
- **Don't** look like **`daisyUI`'s site** — illustrative, mascot-y, loud. The opposite of crafted-restrained.
- **Don't** look like **`Astro`'s rebrand** — dark backgrounds, space illustrations, heavy gradients. Wrong family entirely.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe on cards, callouts, or alerts. Match-and-refuse.
- **Don't** use gradient text. `background-clip: text` over a gradient is decorative-by-default and never meaningful here.
- **Don't** use em dashes in body copy. Use commas, colons, semicolons, periods, or parentheses.
- **Don't** use `#000` or `#fff` anywhere. Every "black" and "white" must be tinted toward the accent hue.
- **Don't** animate CSS layout properties. Don't use bounce or elastic easing. Ease-out-quart / quint / expo only.
- **Don't** use modals. Exhaust inline / progressive alternatives first; on this landing there is no legitimate use case.
