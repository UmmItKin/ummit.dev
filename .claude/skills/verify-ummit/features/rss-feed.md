# RSS feed

A visitor subscribes in a feed reader and gets every published blog post with its title, description, date and full text.

## Sub-features

- `rss-serve` serves valid XML at `/rss.xml`.
- `rss-items` lists the published blog posts and no other collection.
- `rss-links` links each item to its post page.

## How to get to it (user POV)

- Choose the RSS icon in the header.
- Add `https://ummit.dev/rss.xml` to a feed reader.

## Driving it with verify.sh

Preconditions:

- Baseline from the [index](./README.md).
- `B=~/.cache/verify-ummit`.

- **Serve.** Run `$V get /rss.xml`. It prints `200`. `head -c 200 $B/rss.xml.body` starts with `<?xml` and an `<rss` element.
- **Items.** `grep -c '<item>' $B/rss.xml.body` prints the number of published blog posts, the same number as the count line on `/blog/`.
- **Blog only.** `grep -o '<link>[^<]*</link>' $B/rss.xml.body | grep -vc '/posts/'` prints `1`, the channel link. No item points at `/ctf/`, `/infosec/`, `/musings/` or `/research/`.
- **Links resolve.** Take one item link, strip the origin and any doubled slash, and `$V get` it. It prints `200`.
- **Proof.** Keep `rss.xml.body` and the `grep` output.

## Gotchas

- Item links currently contain a doubled slash, `https://ummit.dev//posts/...`, because `rss.xml.ts` joins `context.site` (which ends in `/`) with `/posts/`. This is a known defect as of commit `07fb2d6`, not a harness artifact. Remove this line once it is fixed.
- A password-protected post appears in the feed with its title and description but no body.
- Drafts are absent in this production build.
