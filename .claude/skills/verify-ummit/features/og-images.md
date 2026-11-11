# OG images

When a visitor shares a link, the preview card shows a generated image with the section label and the page title. Every post and every static page has one.

## Sub-features

- `og-post` serves a PNG for each post.
- `og-page` serves a PNG for each listing and static page.
- `og-meta` points each page's `og:image` tag at an image that exists.

## How to get to it (user POV)

- Paste a page url into a chat app or social site and look at the preview card.
- Open `/og/<post id>.png` for a blog post, `/og/<collection>/<post id>.png` for other collections, `/og/<page>.png` for a page.

## Driving it with verify.sh

Preconditions:

- Baseline from the [index](./README.md).
- `B=~/.cache/verify-ummit`.

- **Post image.** Run `$V get /og/Browser/Extensions/browsing-extensions.png`. It prints `200`. `file $B/og_Browser_Extensions_browsing-extensions.png.body` reports `PNG image data, 1200 x 630`.
- **Page image.** Run `$V get /og/blog.png` and `$V get /og/index.png`. Both print `200` and `file` reports the same size.
- **Meta tag.** Run `$V get /posts/Browser/Extensions/browsing-extensions/`, then `grep -o 'og:image" content="[^"]*"' $B/posts_Browser_Extensions_browsing-extensions.body`. Strip `https://ummit.dev` from the printed url and `$V get` the rest. It prints `200`.
- **Look.** Copy the `.png.body` file to a `.png` name and open it with the Read tool. The section label and the full title are readable and not clipped.
- **Proof.** Keep the image, the `file` output and the meta tag line.

## Gotchas

- The meta tag holds the production origin, not the preview one. Always strip the origin before fetching.
- A post with `image` frontmatter uses that image and has no generated card of its own in the tag.
- A static page missing from either map (see `routing.md`) falls back to `/avatar.webp`. `/AI/` does this today.
- A new collection whose `getOgPath()` branch is missing still builds. Its posts point at `/og/<id>.png`, which returns 404, so the meta tag check is the one that catches it.
