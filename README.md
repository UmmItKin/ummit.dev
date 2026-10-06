# UmmIt

[![Astro](https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=fff)](https://astro.build/)
[![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=fff)](https://vuejs.org/)
[![UnoCSS](https://img.shields.io/badge/UnoCSS-333333?style=for-the-badge&logo=unocss&logoColor=fff)](https://unocss.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

> My personal website and blog — [ummit.dev](https://ummit.dev) / [lamkin.me](https://lamkin.me)

## About

The source for my personal site: a blog, CTF writeups, and a homepage covering what I work on. It started as a fork of the [astro-theme-vitesse](https://github.com/kieranwv/astro-theme-vitesse) template and has drifted a long way from it since.

I forked the theme because the original had stopped getting updates. I keep this copy current and on the latest dependencies, and add features when I need them. If any of it is useful to you, take it.

## Tech stack

- **[Astro](https://astro.build/) 7** — static site generation, content collections via the content layer API
- **[Vue 3](https://vuejs.org/)** — the few interactive islands (charts, radar)
- **[UnoCSS](https://unocss.dev/)** — atomic CSS, dark theme only
- **[MDX](https://mdxjs.com/)** — posts and writeups
- **[Bun](https://bun.sh/)** — package manager and runtime

## Features

Built on top of the original Vitesse theme:

- **6 content collections** — `blog`, `infosec`, `ctf`, `musings`, `research`, `pages`
- **Auto OG images** — a unique Open Graph image per page and per post, rendered with Satori
- **View and like counters** — serverless, talking straight to the Firestore REST API with no SDK and no API key
- **Build freshness stamp** — the footer shows the deployed commit and checks it against GitHub
- **Self-hosted variable fonts** — Google Sans Flex and Google Sans Code, so no external font requests
- **Competition record** — a table of CTF placements and rankings on the homepage
- **Per-post `lastmod`** for edited posts
- **Extra pages** — friends, gear, links, projects, and video
- **Responsive** — mobile-first, with tables that switch to a card layout on small screens
- **Dark-only theme** tuned for reading at night

## Getting started

You need [Bun](https://bun.sh/) and Node 24.x. npm and yarn are not supported.

```bash
bun install      # install dependencies
bun dev          # dev server on port 4321 (--host enabled)
bun run build    # production build
bun lint:fix     # auto-fix lint issues
```

Use `bun run build`, not `bun build` — the bare form runs Bun's own bundler instead of the build script.

## Password-protected posts

Add a quoted password to a `.md` post in `blog`, `infosec`, `ctf`, `musings`, or `research`:

```yaml
---
title: A locked post
date: 2026-10-07
password: 'replace: with a long unique passphrase'
---
```

The build encrypts the rendered body and table of contents with AES-256-GCM and a PBKDF2-SHA-256 key (600,000 iterations). Readers enter the password to decrypt it in their browser. Passwords are not saved in browser storage. HTTPS or localhost is required. Remove `password` to publish the body normally; an empty password fails validation.

Titles, descriptions, cover images, dates, and URLs stay public. RSS omits the locked body. Images and downloads remain public files even when their links appear inside encrypted text. This supports static Markdown, not MDX components or scripts inside posts.

The source `.md` still contains the password and plaintext. Keep it in a private repository if the content needs to stay private, and deploy only `dist/`. Use a long, unique passphrase because visitors can download the ciphertext and try passwords offline. Rebuilding with a different password cannot revoke copies someone already downloaded.

## Deployment

The site is static, so the build output in `dist/` can be hosted anywhere. `Dockerfile.vercel` builds it with Bun and serves the static files, and is used for the Vercel deploy.

## Contributing

- [`CLAUDE.md`](./CLAUDE.md) — the single reference for conventions, architecture, content rules, and the checklist for adding a content collection
- [`AGENTS.md`](./AGENTS.md) — a thin pointer to `CLAUDE.md` for other agents and tools

## License

Licensed under the [MIT License](./LICENSE).
