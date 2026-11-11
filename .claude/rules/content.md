---
paths:
  - "src/content/**"
---

# Content rules

- **Do not edit existing posts or writeups unprompted.** Report content problems to the user instead of fixing them.
- No em-dashes in body text, use placeholders not real data, integrate into existing articles rather than appending.
- Run English prose through `/humanizer:humanizer` before finishing (full rule in `CLAUDE.md`). Skip CJK content entirely. The em-dash in a writeup **title** is house style and stays.
- **Frontmatter** — `date` is the publish (or competition) date, `lastmod` the last edit. `draft: true` hides a post in production builds only. `redirect` makes the list entry link out to an external url, `video` marks it with a film icon, `tag` and `duration` print in the post header. `src/content/pages/posts-props.md` is the user-facing reference.
- **`password` works on `.md` only.** An `.mdx` post with a password fails the build.
- **Post ids keep the directory casing**, so a folder rename changes the url.
- **Code blocks wrap.** Shiki runs with `wrap: true` (theme `github-dark-default`), so long lines wrap instead of scrolling horizontally.

## CTF writeups

- **Titles** — call it `<Event> — Official Writeup` only when the user hosted or authored that CTF/challenge. If the user merely competed in someone else's event, the title is just `<Event> — Writeup`.
- **Structure** — lives in `src/content/ctf/writeups/<slug>/index.md`. Combine every challenge into one page. Category as `##`, challenge as `###`, and four `####` phases per challenge in this order: `Overview`, `Insight`, `Exploitation`, `Root cause`. Open with a `## Contents` table (Category / Challenge / bug class). Use `date` for the competition date and `lastmod` for when the writeup was actually written (they differ for late writeups). Prefer an `Overview` heading over `Setup`.
- **Source writeups are often mixed Chinese/English with filler** (e.g. "suggested image placement" notes, dead `step_N.png` image links). Compose clean English and drop the filler and broken links rather than copying verbatim. Verify every challenge dir is covered; do not invent flags for challenges whose source never recorded one.
