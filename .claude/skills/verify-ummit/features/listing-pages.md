# Listing pages

A visitor opens a section and sees a sub-navigation across the sections, a line counting the posts, and the posts newest first, each linking to its page.

## Sub-features

- `list-render` serves each section's listing.
- `list-count` shows the count line, such as `104 articles written`.
- `list-links` links every entry to its post page.
- `list-filter` serves the `/blog/<path>` filtered listings.

## How to get to it (user POV)

- Choose `Blog` in the header, then a section in the sub-navigation.
- Open `/blog/`, `/ctf/`, `/infosec/`, `/musings/` or `/research/` directly.

## Driving it with verify.sh

Preconditions:

- Baseline from the [index](./README.md).
- `B=~/.cache/verify-ummit`.

- **Render.** Run `for s in blog ctf infosec musings research; do $V get /$s/; done`. Each prints `200`.
- **Count line.** `grep -o '[0-9]* [a-z]* written' $B/blog.body` prints one line. The number equals `grep -c '<item>' $B/rss.xml.body` after `$V get /rss.xml`, since both list the published blog posts.
- **Links.** `grep -o 'href="/posts/Browser/Extensions/browsing-extensions[^"]*"' $B/blog.body` prints the reference post's link. Run `$V get` on that href and expect `200`.
- **Order.** `grep -o 'href="/posts/[^"]*"' $B/blog.body | head -3` lists the newest posts first. Compare against the `date` frontmatter of those posts.
- **Filtered listing.** Run `$V get /blog/infosec/`. It prints `200`.
- **Proof.** Keep the five `.body` files and the `grep` output.

## Gotchas

- Entries with `redirect` frontmatter link to an external url, not `/posts/...`, so the number of `/posts/` links is lower than the count line. Do not assert they match.
- Not every entry carries a `data-stat-id`, for the same reason.
- Drafts are absent here because this is a production build. They do appear in `bun dev`.
- The nouns differ per section (`articles`, `writeups`, and so on), so match on `written` or read the wrapper in `src/pages/<section>/index.astro`.
