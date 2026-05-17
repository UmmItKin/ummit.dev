# UmmIt.dev — Agent Notes

Personal blog: Astro 6 + Vue 3 + UnoCSS + MDX. Static SSG only. Requires Node 22+.

## Commands

Use **Bun only** (never npm/yarn):

```bash
bun dev          # dev server, --host enabled (port 4321 default)
bun build        # production build (also runs in pre-commit hook)
bun lint:fix     # auto-fix; runs in pre-commit via simple-git-hooks + lint-staged
```

CI only runs `bun run lint` (`.github/workflows/ci.yml`). No test suite exists.

Pre-commit hook runs `bun lint-staged && bun run build` — a broken build blocks commits.

## Content collections

Defined in `src/content.config.ts` (Astro v6 content layer API; **not** `src/content/config.ts`). All blog-like collections share `postSchema`: `blog`, `talks`, `ctf`, `research`, `paper`, `infosec` (+ `pages` for static).

- All collections use the `glob()` loader from `astro/loaders` with a custom `generateId` to **preserve original directory casing** in URLs (default `github-slugger` lowercases everything, which would break existing URLs like `/posts/InfoSec/...`).
- Use **`entry.id`** (not `entry.slug` — removed in v6). For rendering: `import { render } from 'astro:content'` then `await render(entry)` (not `entry.render()`).
- Frontmatter date field is **`date`** (not `publishDate`). Schema transforms it to a localized string at build time.
- `PostKey` in `src/types.ts` must be kept in sync with collections.
- Posts can live as `<slug>.md` or `<slug>/index.md` with co-located assets.

### Adding a new collection (full checklist)

Missing any step breaks routing or OG images:

1. Entry in `src/content.config.ts` via `postCollection('./src/content/<name>')` + add to `collections` export
2. Add name to `PostKey` union in `src/types.ts`
3. `src/pages/<name>/index.astro` (listing)
4. `src/pages/<name>/[...slug].astro` (post pages)
5. Add to `siteConfig.page.blogLinks` in `src/site-config.ts` for nav
6. `src/pages/og/<name>.png.ts` (collection OG)
7. `src/pages/og/<name>/[...slug].png.ts` (per-post OG)
8. Handle the new collection in `getOgPath()` inside `src/components/PostLayout.astro`

Do **not** add a `[...path].astro` alongside `index.astro` at the same level — they conflict.

## Architecture quirks

- **`src/components/` is flat** (not grouped by `layout/content/ui` despite older docs). Key files: `BaseHead.astro`, `Header.vue`, `PostLayout.astro`, `ListPosts.astro`, `DeadManSwitch.vue`, `SkillRadar.vue`.
- **Astro frontmatter `---` syntax does NOT work in `.ts` files** — only `.astro` components. Endpoint files (`*.png.ts`, `*.xml.ts`) are plain TS.
- `src/utils/og-image.ts` has a known false-positive Buffer LSP error — ignore it.
- Dead Man Switch is gated by `enableDeadManSwitch` flag in `src/layouts/BaseLayout.astro` — currently disabled. Don't re-enable without asking.
- `SkillRadar.vue` — **do not modify**, user maintains it manually.
- Known pre-existing build warnings (safe to ignore unless asked): duplicate content ids in `hkcert/2025`, `airsnitch-deep-analysis`, `infosec/aircrack-ng`; `/projects/data` missing GET handler.

## Style conventions

- ESLint: `@antfu/eslint-config`. Pre-commit auto-fixes via lint-staged (`*` → `bun run lint:fix`).
- Use **UnoCSS atomic classes**; design shortcuts (e.g. `bg-main`, `text-main`, `nav-link`) live in `uno.config.ts`.
- Icons: verify against installed iconify sets before using. Common: `i-ri-*` (Remix), `i-simple-icons-*`. Don't invent icon names.
  - Navbar GitHub uses `i-ri-github-line`; index page uses `i-simple-icons-git`.
- Dark theme only. No light mode toggle.

## Astro component gotchas

`prettier-plugin-astro` is brittle inside conditional JSX fragments `{cond && (<>…</>)}`:

- **Hoist `<style>` and `<script>` blocks to top-level** of the `.astro` file (after the closing `}` of the fragment). Astro hoists them anyway, and inside `<>` the prettier parser chokes with cryptic `Unexpected token, expected "}"` errors pointing at unrelated lines.
- **No JSX-style `{/* */}` comments** inside fragments (prettier-astro fails on punctuation like `;`). Use HTML `<!-- -->` only when outside `<>`, otherwise delete the comment.
- **Inline `<script>` blocks are plain JS, not TS.** TS generics (`querySelectorAll<HTMLElement>`, `Map<string, …>`), `interface`, and `as` casts all break the parser. Cast via `instanceof` checks instead.
- **`} else {` triggers a rule conflict** between `format/prettier` (wants same-line) and `style/brace-style` (wants split). Refactor to separate `if` blocks or early returns.
- **Prose styles clobber children.** Anything inside `<article class="prose">` inherits margins, `list-style`, and `::marker`. Add `not-prose` on the wrapper plus `!important` global CSS to override `ul`/`li`/`::before` when needed.
- `getHeadings()` from `render(entry)` returns `MarkdownHeading[]` with auto-slugged IDs (no rehype plugin needed).

## Content writing rules (user preferences)

- **No em-dashes (—) in body text.** Use colons, periods, or restructure. Em-dashes OK in titles/descriptions only.
- Hover preview cards (`HoverPreviewLink.astro`) are **text-only** — no images.
- Use placeholders (`<your-interface>`, `11:22:33:44:55:66`) instead of real personal data in commands.
- When merging into existing articles, **integrate** rather than appending new sections.
- CTF writeups: never include real flags.

## Git workflow

- Conventional commits, single line, simple English (e.g. `chore: remove Auron tooltip`).
- Pre-commit hook runs `bun lint:fix` on staged files — expect auto-edits to your commit.
- Release: `bun release` (bumpp) → triggers `release.yml` → changelogithub.
