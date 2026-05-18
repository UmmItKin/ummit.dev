# UmmIt.dev — Agent Notes

Personal blog: Astro 6 + Vue 3 + UnoCSS + MDX. Static SSG only. Requires Node 22+.

## General

- When unsure about a tool, API, or configuration detail, use the **Brave Search MCP** tool (or `websearch`) to look it up — don't guess.
- Build warnings from vendored dependencies (`@vueuse/core`) are suppressed in `astro.config.ts` via `rollupOptions.onwarn`.

## Commands

Use **Bun only** (never npm/yarn):

```bash
bun dev          # dev server, --host enabled (port 4321 default)
bun build        # production build (also runs in pre-commit hook)
bun lint:fix     # auto-fix; runs in pre-commit via simple-git-hooks + lint-staged
```

No test suite. CI only runs `bun run lint` (`.github/workflows/ci.yml`).

Pre-commit hook runs `bun lint-staged && bun run build` — broken build blocks commits.

## Content collections

Defined in `src/content.config.ts` (Astro v6 content layer API). All blog-like collections (`blog`, `infosec`, `ctf`, `research`, `paper`, `talks`) share `postSchema` via `postCollection()` helper. `pages` has its own schema for static pages.

- Posts use `<slug>/index.md` convention with co-located assets. <br>`postSchema` uses `date` (not `publishDate`); `lastmod` is optional. Both are transformed to localized strings at build time.
- Use `entry.id` (not `entry.slug` — removed in v6). Render via `import { render } from 'astro:content'` then `await render(entry)`.
- The `generateId` function preserves original path casing, but all existing content dirs are lowercase kebab-case.
- `PostKey` in `src/types.ts` must be kept in sync with collections.

### Adding a new collection

All 8 steps are required or routing/OG images break:

1. `src/content.config.ts` — add `postCollection('./src/content/<name>')` + export in `collections`
2. `src/types.ts` — add name to `PostKey` union
3. `src/pages/<name>/index.astro` — listing page
4. `src/pages/<name>/[...slug].astro` — post pages (uses `PostLayout`)
5. `src/site-config.ts` — add to `siteConfig.page.blogLinks` for nav
6. `src/pages/og/<name>.png.ts` — collection OG
7. `src/pages/og/<name>/[...slug].png.ts` — per-post OG
8. `src/components/PostLayout.astro` — handle in `getOgPath()`

Do **not** put `[...path].astro` alongside `index.astro` at the same level — they conflict.

## Routing

Key routing quirk (all in `src/pages/`):

| Path | File | Purpose |
|------|------|---------|
| `/blog` / `/blog/<sub>` | `blog/[...path].astro` | Blog listing pages (sub-nav from `blogLinks`) |
| `/posts/<id>` | `posts/[...slug].astro` | Individual blog post pages |
| `/ctf`, `/infosec`, ... | `ctf/`, `infosec/`, ... | Each non-blog collection has its own `index.astro` + `[...slug].astro` |
| `/about`, `/md-style`, ... | `[...slug].astro` (root) | Static pages from `src/content/pages/` |
| `/posts-props` | (from pages collection) | Docs page for content props |

Blog posts are served under `/posts/<id>`, **not** `/blog/<id>`. The `blog/` path is only for filtered listing pages.

## Architecture quirks

- **`src/components/` is flat** — `PostLayout.astro` renders all collection post pages, `ListPosts.astro` renders all listing pages.
- `DeadManSwitch.vue` gated by `enableDeadManSwitch` in `src/layouts/BaseLayout.astro` — currently disabled. Don't re-enable without asking.
- `SkillRadar.vue` — **do not modify**, user maintains it manually.
- `src/utils/og-image.ts` has a known false-positive Buffer LSP error — ignore it.
- Pre-existing build warnings (safe to ignore): two `INVALID_ANNOTATION` warnings from `@vueuse/core` in Vite build. Suppressed via `rollupOptions.onwarn` in `astro.config.ts`.

## Styles

- UnoCSS atomic classes; design shortcuts (`bg-main`, `text-main`, `nav-link`) in `uno.config.ts`.
- Icons: only from installed sets `i-ri-*` (Remix), `i-simple-icons-*`. Don't invent names. <br>Navbar GitHub = `i-ri-github-line`; index page = `i-simple-icons-git`.
- Dark theme only. No light mode toggle.

## Astro component gotchas

`prettier-plugin-astro` is brittle inside conditional JSX fragments `{cond && (<>…</>)}`:

- **Hoist `<style>` and `<script>` blocks to top-level** of the `.astro` file (after the closing `}` of any fragment). Prettier chokes on them inside `<>`.
- **No JSX-style `{/* */}` comments** inside fragments (parser fails on `;`). Use HTML `<!-- -->` or delete the comment.
- **Inline `<script>` blocks are plain JS, not TS.** Cast via `instanceof` checks instead of generics.
- **`} else {` triggers a rule conflict** between `format/prettier` (same-line) and `style/brace-style` (split). Use separate `if` blocks or early returns.
- **Prose styles clobber children.** Use `not-prose` wrapper plus `!important` for `ul`/`li`/`::before` overrides.
- `getHeadings()` from `render(entry)` returns `MarkdownHeading[]` with auto-slugged IDs.

## User content rules

- No em-dashes (—) in body text. OK in titles/descriptions only.
- Hover preview cards (`HoverPreviewLink.astro`) are text-only — no images.
- Use placeholders (`<your-interface>`, `11:22:33:44:55:66`) instead of real personal data in commands.
- When merging into existing articles, integrate content — never append separate sections.
- CTF writeups: never include real flags.

## Git

- Conventional commits, single line, simple English (e.g. `chore: remove Auron tooltip`).
- Pre-commit auto-runs `bun lint:fix` on staged files — expect auto-edits.
- Release: `bun release` (bumpp) → `release.yml` → changelogithub.
