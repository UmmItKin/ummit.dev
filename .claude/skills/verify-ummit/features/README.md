# ummit.dev verification map

The maintained list of what a visitor can do on the site and how to prove each part works. Read this index, then follow the matching feature file.

## Baseline preconditions

- Run from the repo root with `V=.claude/skills/verify-ummit/verify.sh`.
- `$V launch` printed `ready`, and `$V doctor` exits 0.
- The reference post is `Browser/Extensions/browsing-extensions`, a plain `.md` blog post. If it is ever removed, pick another `.md` post under `src/content/blog/` and update the feature files.

## Driving conventions

- Every path starts with `/` and keeps the post id's casing.
- `$V get` first, `grep` the `.body` file it names. Reach for `$V dom` or `$V shot` only when the claim is about script output or appearance.
- Evidence files are in `~/.cache/verify-ummit/`, named after the path.

## Proof and skip reporting

- Quote the status line `get` printed and the matching `grep` output.
- A screenshot proves appearance only. Pair it with a `grep` for anything about content or links.
- Report anything under Limits in `SKILL.md` as not exercised. Do not report a click-only behavior as verified because its markup is present.

## Feature entry contract

Each file has an H1, one paragraph on what the visitor sees, then four H2s in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify.sh`, `Gotchas`.

## Features

- [Post page](./post-page.md): title, dates, source link, counters, LLM block.
- [Listing pages](./listing-pages.md): `/blog`, `/ctf`, `/infosec`, `/musings`, `/research`.
- [OG images](./og-images.md): the generated social card for posts and pages.
- [RSS feed](./rss-feed.md): `/rss.xml`.

## Not mapped

- Password-protected posts. No post in the repo sets `password`, and unlocking needs typing, which this harness cannot do.
- Homepage sections, `/friends`, `/gear`, `/links`, `/projects`, `/video`. Add a file when a change touches one.
