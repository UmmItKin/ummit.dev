# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal website & blog — [ummit.dev](https://ummit.dev). Astro 6 + Vue 3 + UnoCSS + MDX, static SSG only. Forked from `astro-theme-vitesse` with extensive customizations. Requires **Node 22+** and **Bun** (npm/yarn not supported).

## Commands

```bash
bun dev          # dev server on port 3199, --host enabled
bun build        # production build (also runs in pre-commit hook)
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
- **Styles** — UnoCSS shortcuts in `uno.config.ts`; icons only from `i-ri-*` (Remix) and `i-simple-icons-*` sets; dark theme only.
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
| `astro.config.ts` | Astro config (integrations, port 3199, `INVALID_ANNOTATION` warnings suppressed) |
| `uno.config.ts` | UnoCSS shortcuts, presets, icon safelist |
| `src/data/projects.ts` | Project showcase data |

## Component conventions

- Components are flat in `src/components/` — no subdirectories.
- `SkillRadar.vue` — do not modify; user maintains it manually.
- `DeadManSwitch.vue` — gated by `enableDeadManSwitch` in `BaseLayout.astro`; currently disabled. Don't re-enable without asking.
- OG image generation uses Satori (`src/utils/og-image.ts`), with per-collection and per-post endpoints under `src/pages/og/`.

## Git

- Conventional commits, single line, simple English.
- Pre-commit auto-runs `bun lint:fix` on staged files — expect auto-edits from lint-staged.
