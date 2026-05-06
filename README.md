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

- **Astro 6** with the new content layer API
- **Multiple content collections** — `blog`, `ctf`, `talks`, `research`, `paper`
- **Auto OG image generation** — dynamic Open Graph images per page and per post (Satori)
- **Per-post `lastmod`** support
- **Self-hosted fonts** — Inter and DM Mono via `@fontsource` (no Google Fonts requests)
- **Friends page** — showcase your connections
- **Gear page** — share your setup and tools
- **Links page** — curated collection of useful links
- **Dark-only theme** — optimized for dark mode viewing

## Getting Started

Requires [Bun](https://bun.sh/) and Node 22+ (npm/yarn not supported here).

```bash
bun install      # install dependencies
bun dev          # dev server (--host enabled)
bun build        # production build
bun lint:fix     # auto-fix lint issues
```

## Contributing

See [`AGENTS.md`](./AGENTS.md) for repo-specific conventions, content rules, and the checklist for adding a new content collection.

## License

This project is licensed under the [MIT License](./LICENSE).
