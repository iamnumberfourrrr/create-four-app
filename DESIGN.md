---
name: create-four-app
description: Opinionated CLI scaffolder for TanStack + Drizzle + Oxlint pnpm monorepos
---

# Design System: create-four-app

## 1. Overview

**Creative North Star: "The Field Manual"**

`create-four-app` uses a field-manual landing surface: dense, declarative, technical, and precise. The implemented site reads as one ruled sheet with real commands, real generated artifacts, and a compact configurator. The design treats indie developers as peers who want proof fast, not a marketing performance.

The current surface is restrained and document-like. Type, rule lines, and code artifacts carry the page. Color appears as punctuation, primarily on the install command, focus states, section numbers, selected controls, and the favicon's small bottom rule.

**Key Characteristics:**

- Dense technical content over decorative whitespace
- One electric-green accent used sparingly
- Real `tree` output, command output, module rows, and config JSON as primary illustration
- Flat surfaces, ruled sections, and square controls
- Motion as feedback only

## 2. Implemented Tokens

Source of truth: `apps/site/src/styles/globals.css`.

The light theme is canonical: a developer evaluating a stack in a bright workspace where long-form reading matters. Dark mode is a user preference override, not the brand's default scene.

### Colors

The palette is **Restrained**. Tinted neutrals carry the surface, the accent remains under 10% of a viewport, and pure black or pure white are not used.

| Token | Value | Usage |
| --- | --- | --- |
| `--color-paper` | `oklch(97% 0.005 130)` | Light page background |
| `--color-ink` | `oklch(25% 0.01 130)` | Primary text and favicon mark |
| `--color-accent` | `oklch(85% 0.22 130)` | Install underline, selected controls, focus rings, section numbers |
| `--color-on-accent` | `oklch(20% 0.02 130)` | Text on accent-filled controls |
| `--color-mute` | `oklch(60% 0.005 130)` | Captions, metadata, supporting text |
| `--color-rule` | `oklch(82% 0.008 130)` | Dividers, table rows, code borders |

Dark theme overrides:

| Token | Value |
| --- | --- |
| `--color-paper` | `oklch(15% 0.005 130)` |
| `--color-ink` | `oklch(92% 0.005 130)` |
| `--color-mute` | `oklch(55% 0.005 130)` |
| `--color-rule` | `oklch(32% 0.008 130)` |

The accent stays unchanged across themes so it remains a stable signal.

## 3. Typography

**Sans:** `Geist Variable`, with `ui-sans-serif`, `system-ui`, and `sans-serif` fallbacks.

**Mono:** `Geist Mono Variable`, with `ui-monospace`, `SF Mono`, `Menlo`, and `monospace` fallbacks.

The system uses one sans voice plus one mono voice. The mono is reserved for commands, file paths, labels, tables, generated output, and copy affordances.

### Scale

| Token | Value | Usage |
| --- | --- | --- |
| `--text-display` | `clamp(2.5rem, 6vw, 4.5rem)` | Reserved for future hero display moments |
| `--text-headline` | `clamp(1.75rem, 3.5vw, 2.25rem)` | Hero statement and section headings |
| `--text-title` | `1.25rem` | Compact titles |
| `--text-body` | `1rem` | Prose |
| `--text-label` | `0.8125rem` | Metadata, headers, control text |
| `--text-mono-base` | `0.9375rem` | Code, tables, file paths |
| `--text-mono-xl` | `clamp(1.5rem, 3.5vw, 2.5rem)` | Install command |

Body copy stays capped at readable line lengths. Labels are short, often mono, often uppercase, and never used as body text.

## 4. Layout

The page is a three-column document on large screens: anchor navigation, main content, and metadata aside. It collapses to one column on smaller screens. The site uses borders and spacing rhythm instead of cards.

Sections use a consistent pattern: ruled top border, generous vertical padding, accent mono section number, headline, mono sublabel, then dense content. The rhythm alternates between generous reading blocks and compact technical blocks.

## 5. Components

- **Header:** a ruled bar with the product name, `field manual` label, and text-only theme toggle.
- **Hero install command:** the primary action. Large mono command, accent bottom rule, copy button, and alternate command beneath.
- **Section header:** accent section number, sans headline, muted mono sublabel.
- **Copy button:** square bordered mono control. Accent fill appears only after successful copy.
- **Configurator controls:** square segmented controls, chip toggles, and checkboxes. Selected state uses accent fill. Disabled state reduces opacity.
- **Module table:** row-based disclosure, not cards. Hover uses a subtle rule tint. Expanded content reveals files added.
- **Code and output blocks:** real `<pre><code>` blocks with transparent backgrounds, rule borders, overflow handling, and copy affordances.
- **Favicon:** `apps/site/public/favicon.svg`, a 64x64 field-manual mark with tinted paper, ruled frame, ink "4", and one accent rule. It adapts to `prefers-color-scheme` without adding a second asset.

## 6. Motion And Interaction

Motion is responsive: color transitions, copy feedback, theme changes, and disclosure row expansion. Timings come from `--duration-fast`, `--duration-base`, and `--duration-slow`; easing uses `--ease-out-quart` and `--ease-out-expo`.

`prefers-reduced-motion: reduce` disables transitions and animations system-wide. Focus states use a visible accent ring with paper offset.

## 7. Do's And Don'ts

### Do:

- Treat `pnpm dlx create-four-app` as the most important visual element.
- Use real generated artifacts as the page's evidence.
- Keep the accent as punctuation, not decoration.
- Favor ruled rows, code blocks, and dense technical tables over cards.
- Keep all colors in OKLCH and tint neutrals toward the accent hue.
- Keep controls square, compact, and consistent.

### Don't:

- Do not use dotted grids, neon-on-black terminals, mascot energy, or CLI cosplay.
- Do not use a generic shadcn-style card grid as the main landing structure.
- Do not use logo walls as value propositions.
- Do not use gradient text, glassmorphism, decorative blobs, or pure `#000` / `#fff`.
- Do not animate layout properties or use bounce and elastic easing.
- Do not use emoji in brand or interface marks. Use Lucide icons when an icon is needed.
