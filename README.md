# UmmIt

[![Astro](https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=fff)](https://astro.build/)
[![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=fff)](https://vuejs.org/)
[![UnoCSS](https://img.shields.io/badge/UnoCSS-333333?style=for-the-badge&logo=unocss&logoColor=fff)](https://unocss.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

> Personal website & blog — [ummit.dev](https://ummit.dev) / [lamkin.me](https://lamkin.me)

## About

This is the source code for my personal website, built on top of the [astro-theme-vitesse](https://github.com/kieranwv/astro-theme-vitesse) template with extensive customizations to fit my needs.

### Why

Originally, the Vitesse theme seemed to be discontinued, and the source code was no longer being updated. Therefore, I forked it, updated it, and continue to maintain it myself. If you want to use this theme, feel free to do so!

All the packages are using the latest versions and are upgraded by me regularly.

## Features

Extensions on top of the original Vitesse theme:

- **Astro 7** with the content layer API
- **6 content collections** — `blog`, `infosec`, `ctf`, `musings`, `research`, `pages`
- **Auto OG image generation** — dynamic Open Graph images per page and per post (Satori)
- **View and like counters** — serverless, straight to the Firestore REST API (no SDK, no key)
- **Build freshness stamp** — the footer shows the build's commit and checks it against GitHub
- **Per-post `lastmod`** support
- **Self-hosted variable fonts** — Google Sans Flex + Google Sans Code (no external font requests)
- **Competition experience** — table with CTF placements and rankings
- **Friends page** — clean list layout
- **Gear page** — share your setup and tools
- **Links page** — linktree-style with stagger animation
- **Projects page** — showcase with category grouping
- **Responsive design** — mobile-first with card/table adaptive layouts
- **Dark-only theme** — optimized for dark mode viewing

## Getting Started

Requires [Bun](https://bun.sh/) and Node 24.x (npm/yarn not supported here).

```bash
bun install      # install dependencies
bun dev          # dev server (--host enabled)
bun run build    # production build
bun lint:fix     # auto-fix lint issues
```

## Contributing

- [`CLAUDE.md`](./CLAUDE.md) — the single reference for repo conventions, content rules, architecture, and the checklist for adding a new content collection
- [`AGENTS.md`](./AGENTS.md) — a thin pointer to `CLAUDE.md` for OpenCode and other agents

## License

This project is licensed under the [MIT License](./LICENSE).
