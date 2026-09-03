# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal website & blog — [ummit.dev](https://ummit.dev). Astro 7 + Vue 3 + UnoCSS + MDX, static SSG only. Forked from `astro-theme-vitesse` with extensive customizations. Requires **Node 24.x** (`engines` pinned; CI/release still on 22) and **Bun** (npm/yarn not supported).

`AGENTS.md` just redirects here — this file is the single source of truth for any agent. `opencode.json` configures the OpenCode tool's ponytail plugin and is unrelated to Claude; leave it alone.

`Dockerfile.vercel` builds `dist/` with Bun and serves it from `node:22-alpine` via `serve`. It is a deploy artifact only, nothing in the dev loop touches it.

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

Because nothing tests behaviour, **grep the built output in `dist/` after a change** rather than trusting a green build. A passing build only proves the syntax parsed. Real bugs found this way include a URL missing a path segment, a dropped CSS property, and a literal `—` in the HTML, all of which built and linted cleanly.

Pre-commit hook (simple-git-hooks + lint-staged): runs `bun lint-staged && bun run build`. A broken build blocks commits.

## Architecture

This file is the authoritative reference for the repo's conventions.

- **Content collections** — 6 collections (`blog`, `infosec`, `ctf`, `research`, `musings`, `pages`) defined in `src/content.config.ts` using the content layer API. The five blog-like ones share `postSchema` via `postCollection(base)`; `pages` has its own smaller schema.
- **Adding a collection touches eight files**, and nothing warns you when you miss one:
  1. `src/content.config.ts` — `postCollection('./src/content/<name>')`, then add it to the `collections` export
  2. `src/types.ts` — add the name to the `PostKey` union
  3. `src/pages/<name>/index.astro` — a `PostListPage` wrapper (~16 lines, copy a sibling)
  4. `src/pages/<name>/[...slug].astro` — `createPostPaths('<name>')`
  5. `src/pages/og/[page].png.ts` — one row in the `pages` map for the listing OG
  6. `src/pages/og/<name>/[...slug].png.ts` — `makeOgSlugRoute('<name>', '<Section>')`
  7. `src/config/site.ts` — a `page.blogLinks` entry, or the nav will not show it
  8. `src/components/PostLayout.astro` — a branch in `getOgPath()`, or posts fall back to the blog OG path and 404
  `rss.xml.ts` is deliberately blog-only (`getPosts()` with no collection), so a new collection stays out of the feed unless you change that too.
- **Routing table** — blog posts live at `/posts/<id>`, not `/blog/<id>`; `/blog` is only for filtered listing pages. Root `[...slug].astro` handles static pages.
- **Shared route helpers, don't hand-roll `getStaticPaths`** — collection post pages call `createPostPaths(collection)` from `PostLayout.astro`; per-post OG routes call `makeOgSlugRoute(collection, section)` from `src/utils/og-image.ts`. Every static page's OG lives in one file, `og/[page].png.ts`, as a `{ page: [section, title] }` map — add a row there, not a new file. The blog per-post OG (`og/[...slug].png.ts`) stays hand-written because it uses `getPosts()` to filter drafts, which the `getCollection`-based factory does not.
- **Footer build stamp** — `Footer.astro` bakes the build commit via `execSync('git rev-parse HEAD')` in frontmatter (build-time), then the client compares it against the GitHub commits API to show up-to-date/stale. Compare logic lives in `src/utils/build-status.ts` (a `.ts` file, not the inline script, because of the `try`/`catch` lint deadlock).
- **Styles** — UnoCSS shortcuts in `uno.config.ts`; dark theme only. `presetIcons` locks no `collections`, so any set in the already-installed `@iconify/json` works: in practice `i-ri-*` (Remix) and `i-simple-icons-*`. **Every icon must be safelisted in `uno.config.ts`** — a name built at runtime (`` `i-circle-flags-${code}` ``) is invisible to the scanner and silently renders nothing.
- **Not every Tailwind utility exists here.** `text-2xs` and `leading-snug` emit no rule at all, and `lh-1.4` is read off the *spacing* scale (`line-height: .35rem`). Use `lh-[1.4]` for an arbitrary line-height, `text-xs` for the smallest text. Nothing warns you — grep the built CSS in `dist/_astro/` for the selector.
- **Fonts** — self-hosted Google Sans Flex (sans) + Google Sans Code (mono) via `src/styles/fonts.css`. Long unicode-range lines trigger Prettier; run `bun lint:fix` after editing. OG images use Satori which only supports TTF/OTF — `public/fonts/Inter-Bold.ttf` is for Satori only, the site uses woff2.
- **Responsive** — breakpoint `md:` = 768px. Pattern: `class="md:hidden"` for mobile-only + `class="hidden md:block"` for desktop-only. Tables on mobile get a separate card/list layout.
- **Write `-webkit-backdrop-filter` before the unprefixed `backdrop-filter`.** The minifier keeps only the last one, so the order picks the survivor. Written first, the prefix is dropped and the unprefixed rule lives, which is what Firefox and Chrome need; reversed, the blur silently dies everywhere but old Safari. No `-webkit-backdrop-filter` reaches `dist/` at all, so grep for the unprefixed one only.
- **The `prose-link` shortcut bakes in `text-nowrap`.** Any long title using it overflows on mobile instead of wrapping. Add `!whitespace-normal` at the call site; do not edit the shortcut, it is site-wide.
- **Child `opacity` cannot undo a parent's.** Anything inside `op-50` stays dimmed; raise its `color` instead. `opacity: 2` is invalid and clamps to 1.
- **Deferred content needs two frames to animate in.** Set the text, then add the class inside `requestAnimationFrame`, otherwise the browser coalesces both into one paint and the transition never runs.
- **Astro component gotchas** — Prettier fragility inside conditional JSX fragments, inline `<script>` is plain JS not TS, `} else {` formatting conflicts.

**`try`/`catch` cannot be used in an inline `<script>` in a `.astro` file.** `format/prettier` wants `} catch {` on one line and `style/brace-style` wants it split, so the two rules deadlock and `lint:fix` cannot resolve it. A single-line `if (x) return` in the same position deadlocks the same way (`lint:fix` splits it and leaves a trailing space prettier then rejects) — restructure so the guard is unnecessary rather than fighting it. Since the pre-commit hook runs a build, this blocks commits. Move the logic into a `.ts` module under `src/utils/` and import it: there the repo's Allman style (`}` newline `catch {`) lints cleanly. `src/utils/share.ts`, `views.ts` and `likes.ts` all exist for this reason.

**Escapes like `'—'` only work in JS string position.** Putting one in JSX text renders the literal characters `—`. Use `{'—'}` or paste the real character.
- **Content rules** — no em-dashes in body text, use placeholders not real data, integrate into existing articles rather than appending.
- **Humanize all prose** — apply the `/humanizer:humanizer` style to every piece of user-facing writing (posts, page copy, UI strings, commit messages, PR text), not just CTF writeups. No rule-of-three, no `not X but Y` aphorisms, no mechanical bold emphasis or promotional phrasing (`is gold`, `the whole game`, `vibrant`, `seamless`), no signposting (`let's dive in`), vary sentence length, prefer plain `is/are/has`. Humanize prose only: leave code, frontmatter values, flags, and data untouched. The em-dash in a writeup **title** is house style and stays.
- **CTF writeup titles** — call it `<Event> — Official Writeup` only when the user hosted or authored that CTF/challenge. If the user merely competed in someone else's event, the title is just `<Event> — Writeup`.
- **CTF writeup structure** — lives in `src/content/ctf/writeups/<slug>/index.md`. Combine every challenge into one page. Category as `##`, challenge as `###`, and four `####` phases per challenge in this order: `Overview`, `Insight`, `Exploitation`, `Root cause`. Open with a `## Contents` table (Category / Challenge / bug class). Use `date` for the competition date and `lastmod` for when the writeup was actually written (they differ for late writeups). Prefer an `Overview` heading over `Setup`.
- **Source writeups are often mixed Chinese/English with filler** (e.g. "suggested image placement" notes, dead `step_N.png` image links). Compose clean English and drop the filler and broken links rather than copying verbatim. Verify every challenge dir is covered; do not invent flags for challenges whose source never recorded one.

## Key files

| File | Purpose |
|------|---------|
| `src/content.config.ts` | Content collection definitions (content layer API) |
| `src/config/` | All site config, re-exported through `src/config/index.ts`. Import as `@/config`, not from individual files. `site.ts` holds nav/social/sub-nav; `features.ts` holds the homepage section flags |
| `src/types.ts` | `PostKey` union (must stay in sync with collections) |
| `src/components/PostLayout.astro` | Renders all collection post pages |
| `src/components/ListPosts.astro` | Renders the post list itself |
| `src/components/PostListPage.astro` | The whole `/blog`, `/ctf`, `/infosec`, `/musings`, `/research` page: nav, count line, list. Those 5 routes are thin prop wrappers, put shared changes here |
| `src/layouts/BaseLayout.astro` | Root layout wrapper |
| `astro.config.ts` | Astro config (integrations, dev port 4321, `INVALID_ANNOTATION` warnings suppressed) |
| `uno.config.ts` | UnoCSS shortcuts, presets, **icon safelist** (new icons must be added here) |
| `src/styles/fonts.css` | Self-hosted @font-face declarations for Google Sans Flex + Google Sans Code |
| `src/pages/index.astro` | Homepage (bio, badge groups, competitions, CTF contributions, conferences, stacks) |
| `docs/firestore.rules` | Security rules for the view/like counters. Must be pasted into the Firebase console by hand, nothing deploys them |
| `public/fonts/` | Self-hosted woff2 font files + Inter-Bold.ttf (for Satori OG images) |

## View and like counters

The site is static SSG with no server, so both counters talk to the **Firestore REST API** directly from the browser. No Firebase SDK, no dependency, no API key: `src/config/views.ts` holds only `enabled` and `projectId`, and the project id is public by design and ships in every page's HTML.

- **`views` and `likes` are separate Firestore collections.** Document ids are post ids with `/` replaced by `_`, since Firestore rejects `/` in ids.
- **Build the REST urls with `docRefs(collection, id)` / `batchRefs` from `src/utils/views.ts`**, never by hand. `ViewCounter`, `LikeButton` and `ListPosts` all go through them, so the write path and the read path cannot drift apart.
- **Writes use `fieldTransforms` with `increment`**, which is atomic server-side. A read-then-write would lose counts when two people open a post at once.
- **`docs/firestore.rules` is the only access control.** The endpoint is public and unauthenticated, so the rules must stay restrictive: `+1` only, `count` field only, everything outside the two collections closed. Allowing `-1` would let anyone script a count down to zero, which is why likes are one way.
- **Listing pages use `batchGet`** (`src/utils/stats.ts`), one request for the whole page instead of two per post. **The response order does not match the request order**, so read the id back off each `found.name` rather than by index.
- Views increment once per session (`sessionStorage`); likes are one way and remembered in a cookie. Both are client-side, so clearing storage lets a visitor count again. Preventing that needs real auth.
- A missing document reads as `null`. Likes show that as `0`; views leave it blank, because a view is written on load so `null` there means the fetch actually failed.

## Component conventions

- Components are flat in `src/components/` — no subdirectories.
- `SkillRadar.vue` — do not modify; user maintains it manually.
- `DeadManSwitch.vue` — gated by `features.deadMansSwitch` in `src/config/features.ts` (read in `BaseLayout.astro`); currently `false`. Don't re-enable without asking.
- `ConferenceHeatmap.astro` — month grid + hover card for `src/config/conferences.ts`. Its card is `position: fixed` and placed by an inline script reading `getBoundingClientRect()`, because an absolute card gets pinned to the ~240px grid instead of tracking the cell. Do not wrap it in a `container-type` element or an `overflow` container: layout containment makes that element the containing block for fixed descendants, and the script's viewport coordinates then land in the wrong place.
- OG image generation uses Satori (`src/utils/og-image.ts`). Under `src/pages/og/`: one `[page].png.ts` covers every static page, and each collection has its own `<name>/[...slug].png.ts` for per-post images.

## Git

- Conventional commits, single line, simple English.
- No trailers in commit messages: never add `Co-Authored-By` or `Claude-Session` lines.
- Pre-commit auto-runs `bun lint:fix` on staged files — expect auto-edits from lint-staged.
