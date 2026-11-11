---
paths:
  - "uno.config.ts"
  - "src/**/*.{astro,vue,css}"
---

# Styles

- **UnoCSS shortcuts live in `uno.config.ts`; dark theme only.** `presetIcons` locks no `collections`, so any set in the already-installed `@iconify/json` works: in practice `i-ri-*` (Remix) and `i-simple-icons-*`. **Every icon must be safelisted in `uno.config.ts`** — a name built at runtime (`` `i-circle-flags-${code}` ``) is invisible to the scanner and silently renders nothing.
- **Not every Tailwind utility exists here.** `text-2xs` and `leading-snug` emit no rule at all, and `lh-1.4` is read off the *spacing* scale (`line-height: .35rem`). Use `lh-[1.4]` for an arbitrary line-height, `text-xs` for the smallest text. Nothing warns you — grep the built CSS in `dist/_astro/` for the selector.
- **Fonts** — self-hosted Google Sans Flex (sans) + Google Sans Code (mono) via `src/styles/fonts.css`, woff2 files in `public/fonts/`. Long unicode-range lines trigger Prettier; run `bun lint:fix` after editing.
- **Responsive** — breakpoint `md:` = 768px. Pattern: `class="md:hidden"` for mobile-only + `class="hidden md:block"` for desktop-only. Tables on mobile get a separate card/list layout.
- **Write `-webkit-backdrop-filter` before the unprefixed `backdrop-filter`.** The minifier keeps only the last one, so the order picks the survivor. Written first, the prefix is dropped and the unprefixed rule lives, which is what Firefox and Chrome need; reversed, the blur silently dies everywhere but old Safari. No `-webkit-backdrop-filter` reaches `dist/` at all, so grep for the unprefixed one only.
- **The `prose-link` shortcut bakes in `text-nowrap`.** Any long title using it overflows on mobile instead of wrapping. Add `!whitespace-normal` at the call site; do not edit the shortcut, it is site-wide.
- **Child `opacity` cannot undo a parent's.** Anything inside `op-50` stays dimmed; raise its `color` instead. `opacity: 2` is invalid and clamps to 1.
