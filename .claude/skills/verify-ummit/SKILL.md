---
name: verify-ummit
description: Drive the built ummit.dev site (Astro static blog) the way a visitor's browser does and capture proof. Builds dist/, serves it on a private local port, fetches pages and takes headless Chrome screenshots. Use after any change to pages, components, routes, OG images, the feed or styles, when you need evidence that the built site behaves correctly and not just that the build passed.
---

# Verify ummit.dev

The site is static, so the thing a visitor touches is the HTML, CSS, images and feed in `dist/`. This skill builds that output, serves it, and gives you four ways to look at it. Everything goes through one helper, run from the repo root:

```bash
V=.claude/skills/verify-ummit/verify.sh
```

Needs `bun`, `curl`, `ss` and `google-chrome-stable` (override with `CHROME=`).

## Launch

```bash
$V launch
```

Runs `bun run build` (about 30 seconds, log in the evidence dir) and starts `astro preview` on `http://127.0.0.1:4399`. It is ready when it prints `ready http://127.0.0.1:4399 (pid N, evidence in DIR)`. A failed build prints the last 20 log lines and exits 1.

- `VERIFY_PORT=4400 $V launch` uses another port. Pass the same variable to every later command.
- Port 4321 belongs to the user's own `bun dev`. Never drive or stop it.
- `dist/` is shared. Two launches at once overwrite each other's build, and a launch rebuilds under the user's `bun preview` if one is running. One verification run at a time per checkout.
- Launch refuses to start if the port already answers. That instance is not yours: stop your own with `$V stop` or pick another port.

After editing source, `$V stop` then `$V launch` again. The preview serves whatever was built last.

## Doctor

```bash
$V doctor
```

Read-only. Exits 0 only if all three hold: the process this harness recorded still owns the port, the site answers, and the commit baked into the footer (`data-build`) is `HEAD`. It also prints a `note` when source files have uncommitted changes, because the commit stamp cannot tell whether `dist/` includes them. Relaunch in that case.

## Drive

Paths are site paths with a leading slash. Post ids are case-sensitive (`/posts/Linux/...`).

| Command | What it does | Output file |
|---|---|---|
| `$V get <path>` | `curl` the path. Prints the status, exits 1 unless it is 200 | `<name>.body`, `<name>.headers` |
| `$V dom <path>` | Loads the page in headless Chrome, lets scripts run, dumps the resulting DOM | `<name>.dom.html` |
| `$V shot <path>` | Same load, full-page-ish screenshot at 1280x2400 (`VERIFY_SIZE=390,1600` for mobile) | `<name>.png` |

`<name>` is the path with slashes turned into underscores, `index` for `/`.

Use `get` plus `grep` for anything in the served HTML: text, links, meta tags, classes, `data-*` attributes. Use `dom` when the thing you are checking is written by a client script. Use `shot`, then open the PNG with the Read tool, for layout and styling.

Stable handles in this site: `article.prose h1` for the post title, `meta property="og:image"`, `.view-counter` and `[data-stat-id]` for counters, `.ai-copy` for the LLM block, `[data-build]` for the footer stamp, `#post-unlock-status` for a locked post. Per-feature recipes are in [`features/`](./features/README.md).

Chrome runs with every host except `127.0.0.1` unresolvable. This is deliberate: a real page load would add a view to the production Firestore counter and an event to Umami. The cost is listed under Limits.

## Evidence

Everything lands in `~/.cache/verify-ummit/` (override with `VERIFY_OUT=`), outside the repo so nothing needs ignoring. A later `get`, `dom` or `shot` of the same path overwrites the earlier file, so copy a file aside if you need before and after.

A proof is:

- the command, its printed status line, and the `grep` output or screenshot that shows the claim
- taken from the preview server, not from reading `dist/` or the source. A file existing in `dist/` does not prove the route serves it
- for a change, both sides: the thing that should now be there and the thing that should be gone
- a `$V doctor` pass from the same run, so the evidence is tied to the current commit

## Limits

State these in any report instead of implying they were checked.

- No clicks and no typing. The like button, the share dialog, the copy button and the password unlock form cannot be driven. For those, prove the markup and the script wiring, and say the interaction was not exercised.
- Nothing off-site loads in Chrome. View and like counts stay empty or `0`, the footer freshness label stays blank, and images that posts hotlink from other hosts show as broken. That is the harness, not a bug.
- The view and like counters cannot be proven end to end without writing to production. Prove the REST urls rendered into `data-doc-url` and `data-commit-url` instead.

## Cleanup

```bash
$V stop
```

Kills only the process recorded at launch and removes the pid file. It never touches `dist/`, the user's dev server, or the evidence dir. Run it after a failed attempt too. Evidence stays in `~/.cache/verify-ummit/` until someone deletes it by hand.
