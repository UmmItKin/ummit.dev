---
paths:
  - "src/pages/**"
  - "src/content.config.ts"
  - "src/types.ts"
  - "src/config/site.ts"
  - "src/utils/{posts,og-image}.ts"
  - "src/components/{PostLayout,PostListPage}.astro"
---

# Collections, routing and OG images

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
- **`page.blogLinks` drives routes as well as the nav.** `src/pages/blog/[...path].astro` maps every entry to a `/blog/<path>` listing that filters the blog collection with `post.id.includes(path)` and points its OG at `/og/<path>.png`. A new entry therefore creates `/blog/<name>` too, which is one more reason step 5 above matters.
- **Adding a static page needs two OG edits.** A file in `src/content/pages/` gets a generated OG image only with a row in `og/[page].png.ts` and a matching entry in the `generatedOgImages` map in the root `[...slug].astro`. With either missing the page silently falls back to the avatar, as `AI.md` currently does.
- **Shared route helpers, don't hand-roll `getStaticPaths`** — collection post pages call `createPostPaths(collection)` from `PostLayout.astro`; per-post OG routes call `makeOgSlugRoute(collection, section)` from `src/utils/og-image.ts`. Every static page's OG lives in one file, `og/[page].png.ts`, as a `{ page: [section, title] }` map — add a row there, not a new file. Both the factory and the hand-written blog route (`og/[...slug].png.ts`) go through `getPosts()`, so drafts get no OG image in production.
- **OG images use Satori** (`src/utils/og-image.ts`), which only supports TTF/OTF. `public/fonts/Inter-Bold.ttf` exists for Satori only; the site itself uses woff2.
- **Post ids keep the directory casing.** `generateId` in `content.config.ts` overrides Astro's lowercasing slugger, so ids, urls and OG paths are case-sensitive (`/og/Linux/...`, `/og/windows/...`).
- **`date` is a display string, `dateRaw` is the real timestamp.** The schema transforms `date` and `lastmod` into `Nov 5, 2026` style strings and copies the original into `dateRaw` first. Sort and compare on `dateRaw` (`sortPostsByDate` in `src/utils/posts.ts`), never on `date`, or same-day posts lose their order.
- **Fetch posts with `getPosts(path?, collection)`, not `getCollection`.** It drops `draft: true` in production builds only and applies the date sort. Drafts still render in `bun dev`, so check a draft's absence in `dist/`, not in the dev server.
- **Source link and LLM block are `.md` only.** `PostLayout.astro` builds the GitHub blob and raw urls from `post.filePath` with the repo and `master` branch hardcoded. `.mdx` posts get neither, and `AiCopy` is also skipped for password-protected posts. The "outdated article" banner is shown for the `blog` collection only.
- **`PostListPage.astro` is the whole `/blog`, `/ctf`, `/infosec`, `/musings`, `/research` page**: nav, count line, list. Those 5 routes are thin prop wrappers, so put shared changes there.
