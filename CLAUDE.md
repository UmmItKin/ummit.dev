# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal website & blog — [ummit.dev](https://ummit.dev). Astro 7 + Vue 3 + UnoCSS + MDX, static SSG only. Forked from `astro-theme-vitesse` with extensive customizations. Requires **Node 24.x** (`engines` pinned; CI/release still on 22) and **Bun** (npm/yarn not supported).

## Commands

Use **Bun only** (never npm/yarn):

```bash
bun install      # install dependencies
bun dev          # dev server on port 4321, --host enabled
bun build        # production build (also runs in pre-commit hook)
bun preview      # preview the production build locally
bun lint         # eslint check only
bun lint:fix     # auto-fix lint issues (runs in pre-commit hook on staged files)
bun release      # bump version via bumpp → triggers release.yml → changelogithub
```

No test suite exists. CI (`.github/workflows/ci.yml`) runs `bun run lint` only.

Pre-commit hook (simple-git-hooks + lint-staged): runs `bun lint-staged && bun run build`. A broken build blocks commits.

## Architecture

See **[AGENTS.md](./AGENTS.md)** for the full reference — it is the authoritative document for this repo's conventions. Key sections:

- **Content collections** — 7 collections (`blog`, `infosec`, `ctf`, `research`, `paper`, `talks`, `pages`) defined in `src/content.config.ts` using Astro v6 content layer API. All blog-like collections share `postSchema`. Checklist for adding a new collection.
- **Routing table** — blog posts live at `/posts/<id>`, not `/blog/<id>`; `/blog` is only for filtered listing pages. Root `[...slug].astro` handles static pages.
- **Styles** — UnoCSS shortcuts in `uno.config.ts`; icons only from `i-ri-*` (Remix) and `i-simple-icons-*` sets; dark theme only. New icons must be safelisted in `uno.config.ts`. Only Tailwind v3 utility classes exist — `text-2xs` does NOT work (smallest is `text-xs`).
- **Fonts** — self-hosted Google Sans Flex (sans) + Google Sans Code (mono) via `src/styles/fonts.css`. Long unicode-range lines trigger Prettier; run `bun lint:fix` after editing. OG images use Satori which only supports TTF/OTF — `public/fonts/Inter-Bold.ttf` is for Satori only, the site uses woff2.
- **Responsive** — breakpoint `md:` = 768px. Pattern: `class="md:hidden"` for mobile-only + `class="hidden md:block"` for desktop-only. Tables on mobile get a separate card/list layout.
- **Astro component gotchas** — Prettier fragility inside conditional JSX fragments, inline `<script>` is plain JS not TS, `} else {` formatting conflicts.
- **Content rules** — no em-dashes in body text, use placeholders not real data, integrate into existing articles rather than appending.

## Key files

| File | Purpose |
|------|---------|
| `src/content.config.ts` | Content collection definitions (Astro v6 content layer) |
| `src/site-config.ts` | Site-wide config (nav, social links, blog sub-nav) |
| `src/types.ts` | `PostKey` union (must stay in sync with collections) |
| `src/components/PostLayout.astro` | Renders all collection post pages |
| `src/components/ListPosts.astro` | Renders all listing pages |
| `src/layouts/BaseLayout.astro` | Root layout wrapper |
| `astro.config.ts` | Astro config (integrations, dev port 4321, `INVALID_ANNOTATION` warnings suppressed) |
| `uno.config.ts` | UnoCSS shortcuts, presets, **icon safelist** (new icons must be added here) |
| `src/styles/fonts.css` | Self-hosted @font-face declarations for Google Sans Flex + Google Sans Code |
| `src/data/projects.ts` | Project showcase data |
| `src/pages/index.astro` | Homepage (bio, CTF teams, competition table, timeline, stacks) |
| `public/fonts/` | Self-hosted woff2 font files + Inter-Bold.ttf (for Satori OG images) |

## Component conventions

- Components are flat in `src/components/` — no subdirectories.
- `SkillRadar.vue` — do not modify; user maintains it manually.
- `DeadManSwitch.vue` — gated by `enableDeadManSwitch` in `BaseLayout.astro`; currently disabled. Don't re-enable without asking.
- OG image generation uses Satori (`src/utils/og-image.ts`), with per-collection and per-post endpoints under `src/pages/og/`.

## Git

- Conventional commits, single line, simple English.
- Pre-commit auto-runs `bun lint:fix` on staged files — expect auto-edits from lint-staged.
