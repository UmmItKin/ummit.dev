# UmmIt.dev — Agent Notes

Personal blog: Astro 7 + Vue 3 + UnoCSS + MDX. Static SSG only. `engines` pinned to `24.x`; CI and release workflows still use Node 22 (not yet bumped).

## Commands

Use **Bun only** (never npm/yarn):

```bash
bun dev          # dev server, --host enabled (port 4321)
bun build        # production build (also runs in pre-commit hook)
bun lint:fix     # auto-fix; runs in pre-commit via simple-git-hooks + lint-staged
```

No test suite. CI only runs `bun run lint` (`.github/workflows/ci.yml`).

Pre-commit hook runs `bun lint-staged && bun run build` — broken build blocks commits.

## Lint / Format

ESLint flat config (`eslint.config.js`) using `@antfu/eslint-config` with `vue`, `typescript`, `astro`, `formatters.astro`, and `formatters.css`. Ignores `.agents/**` and `.opencode/**`. Import alias `@/` maps to `src/*` (tsconfig.json).

- `prettier-plugin-astro` is brittle inside conditional JSX fragments `{cond && (<>…</>)}`:
  - **Hoist `<style>` and `<script>` blocks to top-level** of the `.astro` file (after the closing `}` of any fragment). Prettier chokes on them inside `<>`.
  - **No JSX-style `{/* */}` comments** inside fragments (parser fails on `;`). Use HTML `<!-- -->` or delete the comment.
  - **Inline `<script>` blocks are plain JS, not TS.** Cast via `instanceof` checks instead of generics.
  - **`} else {` triggers a rule conflict** between `format/prettier` (same-line) and `style/brace-style` (split). Use separate `if` blocks or early returns.

## Content collections

Defined in `src/content.config.ts` (Astro content layer API + `glob` loader). The blog-like collections `blog`, `infosec`, `ctf`, `research`, `paper`, `talks` share `postSchema` via `postCollection()` helper. `pages` has its own schema (title/description/image, no `date`) for static pages.

- Posts use `<slug>/index.md` convention with co-located assets.
- `postSchema` uses `date` (not `publishDate`); `lastmod` is optional. Both are transformed to localized strings at build time.
- `postSchema` has an optional `video: boolean` field — when true, `ListPosts.astro` renders a film icon next to the post.
- `postSchema` has an optional `redirect: string` field — when set, `ListPosts.astro` links to that URL (opens in new tab) instead of the post page. Useful for cross-posted content.
- Use `entry.id` (not `entry.slug` — removed in v6). Render via `import { render } from 'astro:content'` then `await render(entry)`.
- The `generateId` function preserves original path casing, but all existing content dirs are lowercase kebab-case.
- `PostKey` in `src/types.ts` must be kept in sync with collections.
- **`getPosts()` in `src/utils/posts.ts`** — the centralized helper for fetching posts. Filters drafts in production, supports optional path-filtering. All listing and detail pages use this.

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

## Video "collection"

`/video` is **not a content collection** — it's a standalone page (`src/pages/video.astro`) with hardcoded entries. It appears in the sub-nav via `blogLinks` for discovery. Do not try to add video details to `PostKey`, `content.config.ts`, or `PostLayout.getOgPath()`.

## Routing

Key routing quirk (all in `src/pages/`):

| Path | File | Purpose |
|------|------|---------|
| `/blog` / `/blog/<sub>` | `blog/[...path].astro` | Blog listing pages (sub-nav from `blogLinks`) |
| `/posts/<id>` | `posts/[...slug].astro` | Individual blog post pages |
| `/ctf`, `/infosec`, … | `ctf/`, `infosec/`, … | Each collection has its own `index.astro` + `[...slug].astro` |
| `/about`, `/md-style`, … | `[...slug].astro` (root) | Static pages from `src/content/pages/` |
| `/posts-props` | (from pages collection) | Docs page for content props |

Blog posts are served under `/posts/<id>`, **not** `/blog/<id>`. The `blog/` path is only for filtered listing pages.

Blog post OG images use the root `pages/og/[...slug].png.ts` catch-all — there is no `/og/blog/` directory.

## Static data

`src/data/projects.ts` exports `projectData` (typed as `ProjectData` from `@/types`). Hardcoded categories and project entries. Do **not** put `.ts` files under `src/pages/` — they risk being treated as routes (this was the reason data was moved from `src/pages/projects/data.ts` to `src/data/projects.ts`).

## Architecture quirks

- **`src/components/` is flat** — no subdirectories. `PostLayout.astro` renders all collection post pages; `ListPosts.astro` renders all listing pages; `ListProjects.astro` renders the projects page (supports both icon-font classes and SVG `<img>` for local/remote icons).
- `DeadManSwitch.vue` gated by `enableDeadManSwitch = false` in `src/layouts/BaseLayout.astro`. Don't re-enable without asking.
- `SkillRadar.vue` — **do not modify**, user maintains it manually.
- `src/utils/og-image.ts` imports `Buffer` from `node:buffer` — known LSP false positive, ignore.
- Pre-existing build warnings (safe to ignore): two `INVALID_ANNOTATION` warnings from `@vueuse/core` in Vite build. Suppressed via `rollupOptions.onwarn` in `astro.config.ts`.
- `astro.config.ts` raises `EventEmitter.defaultMaxListeners` to 30 to suppress MaxListeners dev warnings.

## Styles

- UnoCSS atomic classes (`presetWind3` = Tailwind v3 utilities; `text-2xs` does NOT exist, smallest is `text-xs`). Design shortcuts (`bg-main`, `text-main`, `nav-link`, `container-link`, `magic-link`, etc.) in `uno.config.ts`.
- Icons: only from installed sets `i-ri-*` (Remix), `i-carbon-*`, `i-simple-icons-*`. Don't invent names. **Dynamically-referenced icons must be added to the `safelist` in `uno.config.ts`** — statically-written ones in `.astro`/`.vue` are picked up by the scanner automatically.
- Dark theme only. No light mode toggle. Responsive breakpoint `md:` = 768px.
- Fonts are **self-hosted**, not via `@fontsource` (despite older notes). Sans = Google Sans Flex, mono = Google Sans Code, declared in `src/styles/fonts.css` and imported by `BaseHead.astro`. UnoCSS `presetWebFonts` uses `provider: 'none'` so it only registers family names without fetching.
- OG images use Satori which only supports TTF/OTF — `public/fonts/Inter-Bold.ttf` and `public/fonts/noto-sc-bold.ttf` exist for Satori only; the live site uses woff2.

## Astro component gotchas

- **Prose styles clobber children.** Use `not-prose` wrapper plus `!important` for `ul`/`li`/`::before` overrides.
- `getHeadings()` from `render(entry)` returns `MarkdownHeading[]` with auto-slugged IDs.
- **JSX eats whitespace between adjacent expressions.** Two `{expression}` blocks on separate lines render concatenated with no space. Put them on one line with an explicit space: `{count} {label}` not `{count}\n{label}`. Same goes for `<i />` followed by `{text}` on the next line. This bit the listing pages (count glued to "articles written") and the homepage social links (icon glued to label) and took three attempts to diagnose because it looked like a CSS issue.

## User content rules

- No em-dashes (—) in body text. OK in titles/descriptions only.
- Hover preview cards (`HoverPreviewLink.astro`) are text-only — no images.
- **Always bump `lastmod`** when editing any content file (posts, pages, etc.). Use current date in `YYYY-MM-DDTHH:MM:SS+0800` format. Generate it with:
  ```bash
  TZ='Asia/Hong_Kong' date '+%Y-%m-%dT%H:%M:%S+0800'
  ```
- Use placeholders (`<your-interface>`, `11:22:33:44:55:66`) instead of real personal data in commands.
- When merging into existing articles, integrate content — never append separate sections.
- CTF writeups: never include real flags.

## Git

- Conventional commits, single line, simple English (e.g. `chore: remove Auron tooltip`).
- Pre-commit auto-runs `bun lint:fix` on staged files — expect auto-edits.
- Release: `bun release` (bumpp) → `release.yml` → changelogithub.
