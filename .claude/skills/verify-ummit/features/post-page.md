# Post page

A visitor opens a post and sees its title, dates, a link to the Markdown source on GitHub, like and view counters, the article body with a table of contents, and a block at the end with a prompt for LLMs.

## Sub-features

- `post-render` serves the post with its title and body.
- `post-source` links to the post's `.md` file on GitHub.
- `post-counters` renders the like and view elements with their Firestore urls.
- `post-llm` renders the "For LLMs and agents" block with the raw source url.
- `post-look` lays the page out correctly on desktop and mobile.

## How to get to it (user POV)

- Click a post title on `/blog` or another listing page.
- Open `/posts/<id>/` directly, for example `/posts/Browser/Extensions/browsing-extensions/`. Posts from other collections live under `/ctf/<id>/`, `/infosec/<id>/`, `/musings/<id>/`, `/research/<id>/`.

## Driving it with verify.sh

Preconditions:

- Baseline from the [index](./README.md).
- `P=/posts/Browser/Extensions/browsing-extensions/` and `B=~/.cache/verify-ummit/posts_Browser_Extensions_browsing-extensions`.

- **Render.** Run `$V get $P`. It prints `200`. `grep -o '<h1[^>]*>[^<]*</h1>' $B.body` prints the post title.
- **Source link.** `grep -o 'href="https://github.com/UmmItKin/ummit.dev/blob/master/[^"]*"' $B.body` prints one link ending in `src/content/blog/Browser/Extensions/browsing-extensions/index.md`.
- **Counters.** `grep -o 'class="view-counter"[^>]*' $B.body` shows `data-doc-url` ending in `/documents/views/Browser_Extensions_browsing-extensions`, with `/` in the id replaced by `_`.
- **LLM block.** `grep -c 'class="ai-copy ' $B.body` prints `1`, and `grep -o 'raw.githubusercontent.com/[^ "<]*' $B.body | head -1` prints the raw url of the same `.md` file.
- **Look.** Run `$V shot $P`, then `VERIFY_SIZE=390,1600 $V shot $P` after copying the first PNG aside. Open each with the Read tool: title, meta line, `Source` link, like button, body and table of contents are visible and nothing overflows the viewport.
- **Proof.** Keep `$B.body`, `$B.png` and the `grep` output.

## Gotchas

- Likes show `0` and the view count is empty in screenshots, because Chrome cannot reach Firestore here. That is expected.
- Body images hosted on other sites render as broken blurred boxes for the same reason.
- `.mdx` posts have no source link and no LLM block by design. Do not report that as a failure.
- The "outdated article" banner appears only on blog posts older than six months, so its presence depends on the day you run this.
