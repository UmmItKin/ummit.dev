# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal website & blog — [ummit.dev](https://ummit.dev). Astro 7 + Vue 3 + UnoCSS + MDX, static SSG only. Forked from `astro-theme-vitesse` with extensive customizations. Requires **Node 24.x** (`engines` pinned; CI and the Docker deploy run the same version) and **Bun** (npm/yarn not supported).

`AGENTS.md` redirects here and to `.claude/rules/`. `graphify-out/`, `.opencode/` and `.codegraph/` are gitignored tool output, not source.

`h3` is pinned to an exact version in `dependencies` although nothing in `src/` imports it. The pin forces the version the UnoCSS inspector resolves in dev, so do not drop it as unused or loosen it in a dependency bump without checking `bun dev` still starts.

`Dockerfile.vercel` builds `dist/` with Bun and serves it from `node:24-alpine` via `serve`. It is a deploy artifact only, nothing in the dev loop touches it.

## Rules

This file holds what every session needs. Topic conventions live in `.claude/rules/` and load on their own when a matching file is read or edited:

| Rule file | Loads for | Covers |
|-----------|-----------|--------|
| `content.md` | `src/content/**` | Content rules, frontmatter, CTF writeup titles and structure |
| `routing.md` | `src/pages/**`, `content.config.ts`, `types.ts`, `site.ts`, `PostLayout.astro` | The eight-file checklist for a new collection, routes, OG images, post ids, `getPosts` |
| `astro.md` | `src/**/*.astro` | Lint deadlocks in inline scripts, escapes in JSX text, client init triggers |
| `styles.md` | `uno.config.ts`, `.astro`/`.vue`/`.css` | Icon safelist, missing utilities, fonts, responsive pattern, CSS traps |
| `counters.md` | view/like utils and components, `docs/firestore.rules` | Firestore REST counters |
| `password-posts.md` | `PasswordPost.astro`, crypto utils, `rss.xml.ts` | Build-time post encryption |
| `components.md` | `SkillRadar`, `DeadManSwitch`, `ConferenceHeatmap`, `Footer` | Per-component notes |

A scoped rule only loads once a matching file is touched. **Before creating a new file, read the matching rule file yourself**: `content.md` before drafting a post or writeup, `routing.md` before adding a collection or page. Put a new convention in the matching rule file, not here.

## Commands

Use **Bun only** (never npm/yarn):

```bash
bun install      # install dependencies
bun dev          # dev server on port 4321, --host enabled
bun run build    # production build (also runs in pre-commit hook)
bun preview      # preview the production build locally
bun lint         # eslint check only
bun lint:fix     # auto-fix lint issues (runs in pre-commit hook on staged files)
bun run release  # bump version + tag + push via bumpp (release notes are hand-written and published with `gh release create`)
```

Use `bun run build`, not `bun build` — the bare form invokes Bun's own bundler (it errors with "Missing entrypoints") instead of the `build` npm script. The same applies to any script whose name collides with a Bun builtin.

No test suite exists. CI (`.github/workflows/ci.yml`) runs `bun run lint` then `bun run build`, matching the pre-commit hook.

Because nothing tests behaviour, **grep the built output in `dist/` after a change** rather than trusting a green build. A passing build only proves the syntax parsed. Real bugs found this way include a URL missing a path segment, a dropped CSS property, and a literal `\u2014` in the HTML, all of which built and linted cleanly.

Pre-commit hook (simple-git-hooks + lint-staged): runs `bun lint-staged && bun run lint && bun run build`. A lint error or broken build blocks commits. The full-repo `bun run lint` step exists because `lint-staged` alone only checks staged files, so a repo-wide reformat (e.g. a `prettier-plugin-astro` major bump) would otherwise pass locally and only fail in CI. Editing the hook in `package.json` requires re-running `bunx simple-git-hooks` to reinstall `.git/hooks/`.

## Writing

- **Do not edit existing posts or writeups under `src/content/` unprompted.** Report content problems to the user instead of fixing them.
- **Humanize all English prose** — whenever you write or edit any user-facing English writing (posts, page copy, UI strings, commit messages, PR text), run it through the `/humanizer:humanizer` skill before you finish. This is not optional and applies to everything, not just CTF writeups. The recurring tells in this repo's old content are staged run-ups (`let's dive in`, `before we dive into`), empty closers (`Happy hacking!`, `unleashing its full potential`), sales words (`vibrant`, `seamless`, `elevate`, `empower`, `streamline`, `captivating`, `trusty companion`), `when it comes to` / `in the world of` filler, and forced `not X but Y` contrasts. Also no rule-of-three, no mechanical bold emphasis, vary sentence length, prefer plain `is/are/has`. Humanize prose only: leave code, frontmatter values, flags, and data untouched. Skip CJK content (Cantonese/Chinese posts and writeups) entirely.

## Key files

| File | Purpose |
|------|---------|
| `src/content.config.ts` | Content collection definitions (content layer API) |
| `src/config/` | All site config, re-exported through `src/config/index.ts`. Import as `@/config`, not from individual files. `site.ts` holds nav/social/sub-nav; `features.ts` holds the homepage section flags |
| `src/types.ts` | `PostKey` union (must stay in sync with collections) |
| `src/utils/posts.ts` | `getPosts()`, the one way to fetch posts (filters drafts, sorts) |
| `src/components/PostLayout.astro` | Renders all collection post pages |
| `src/components/PostListPage.astro` | The shared listing page behind `/blog`, `/ctf`, `/infosec`, `/musings`, `/research` |
| `src/layouts/BaseLayout.astro` | Root layout wrapper |
| `src/pages/index.astro` | Homepage (bio, badge groups, competitions, CTF contributions, conferences, stacks) |
| `astro.config.ts` | Astro config (integrations, dev port 4321, `INVALID_ANNOTATION` warnings suppressed) |
| `uno.config.ts` | UnoCSS shortcuts, presets, **icon safelist** (new icons must be added here) |
| `config.yaml` | Root feature toggles (Dead Man's Switch) |

## Git

- Conventional commits, single line, simple English. Besides the usual `feat`/`fix`/`chore`/`docs`/`style`/`ci`, post and page changes use `content:`.
- No trailers in commit messages: never add `Co-Authored-By` or `Claude-Session` lines.
- Pre-commit auto-runs `bun lint:fix` on staged files — expect auto-edits from lint-staged.
