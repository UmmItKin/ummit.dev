# Copilot Instructions for ummit.dev

Personal website & blog built on Astro 5.x with Vue components, UnoCSS, and MDX.

## Project Architecture

### Stack Overview
- **Framework**: Astro 5.6+ with Islands Architecture
- **UI Framework**: Vue 3 for interactive components (`client:idle` hydration)
- **Styling**: UnoCSS with custom shortcuts (see [uno.config.ts](uno.config.ts))
- **Content**: Astro Content Collections with MDX support
- **Build**: Bun as package manager (preferred over npm/yarn)

### Key Directories
```
src/
├── components/     # .astro (static) and .vue (interactive) components
├── content/        # Content collections: blog/, ctf/, talks/, pages/
├── layouts/        # BaseLayout.astro - main page wrapper
├── pages/          # File-based routing with dynamic routes
│   ├── og/         # Dynamic OG image generation endpoints
│   └── posts/      # Blog post detail pages
├── styles/         # global.css, prose.css (markdown styling)
└── utils/          # Helper functions (posts.ts, og-image.ts)
```

## Development Commands

```bash
bun install        # Install dependencies
bun dev            # Start dev server on port 3199
bun build          # Production build
bun lint           # Run ESLint
bun lint:fix       # Auto-fix linting issues
```

## Content Collections Pattern

### Schema Definition
All post-like collections share a unified schema in [src/content/config.ts](src/content/config.ts):
- `blog`, `talks`, `ctf` use `postSchema` with: title, description, date, lastmod, duration, tag, draft, lang, redirect, video

### Blog Frontmatter Example
```yaml
---
title: Post Title
description: Brief description
date: 2024-01-15T10:00:00+0800
lastmod: 2024-06-20T15:30:00+0800 # optional
tag: Category # optional
lang: en-US # optional, defaults to en-US
draft: false # optional, hides in production
---
```

### Content Organization
Blog posts use deep folder nesting by topic:
```
src/content/blog/
├── Linux/Tools/neovim/NvChad/
├── InfoSec/Cryptography/
└── Web/Hugo/
```
Each post folder contains `index.md` and optional assets (images).

## Component Patterns

### Vue Components (Interactive)
Use Vue for components requiring client-side interactivity:
- `Header.vue` - Navigation with mobile drawer toggle
- `ThemeToggle.vue` - Dark/light mode switch
- `ScrollToTop.vue` - Scroll behavior

Hydrate with `client:idle` in layouts:
```astro
<Header client:idle />
```

### Astro Components (Static)
Use `.astro` for server-rendered content:
- `BaseHead.astro` - SEO meta tags, Open Graph
- `PostLayout.astro` - Blog post template with reusable `createPostPaths()` helper
- `ListPosts.astro` - Post listing component

## UnoCSS Shortcuts

Custom shortcuts defined in [uno.config.ts](uno.config.ts):
```
bg-main      → Light/dark background colors
text-main    → Body text color
text-link    → Link/heading text color
nav-link     → Navigation link styling with opacity hover
prose-link   → Inline link with bottom border
hr-line      → Horizontal rule styling
```

Use UnoCSS attributify mode in templates:
```vue
<div sm:hidden h-full flex items-center>
```

## OG Image Generation

Dynamic OG images generated at build time using Satori + Sharp:
- [src/utils/og-image.ts](src/utils/og-image.ts) - Core generation function
- [src/pages/og/](src/pages/og/) - Route handlers per collection

Pattern for new OG routes:
```typescript
export const GET: APIRoute = async ({ props }) => {
  const png = await generateOgImage('Section', props.title)
  return ogResponse(png)
}
```

## Site Configuration

Centralized config in [src/site-config.ts](src/site-config.ts):
- Author info, social links, header/footer navigation
- `page.blogLinks` - Defines blog category tabs
- Import as: `import siteConfig from '@/site-config'`

## Path Aliases

Use `@/` alias for src imports (configured in tsconfig.json):
```typescript
import siteConfig from '@/site-config'
import { getPosts } from '@/utils/posts'
```

## View Transitions

Uses Astro 5.x `<ClientRouter />` for SPA-like navigation:
```astro
import {ClientRouter} from 'astro:transitions'
<ClientRouter />
```
Fade transitions configured in BaseLayout.astro.

## Adding New Pages

### Static Pages
Create in `src/pages/`:
```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro'
const ogImage = { src: '/og/pagename.png', alt: 'Page Title' }
---

<BaseLayout title="Page" description="..." image={ogImage}>
  <article class="prose">
    <!-- content -->
  </article>
</BaseLayout>
```

### New Content Collection
1. Add collection to [src/content/config.ts](src/content/config.ts)
2. Create folder in `src/content/`
3. Add dynamic route in `src/pages/`
4. Create OG image route in `src/pages/og/`

## Type Definitions

Key types in [src/types.ts](src/types.ts):
- `PostKey = 'blog' | 'talks' | 'ctf'` - Collection identifiers
- `CollectionPosts` - Unified post entry type
- `ProjectData` - Structure for projects page

## Linting & Git Hooks

- ESLint with `@antfu/eslint-config` (see [eslint.config.js](eslint.config.js))
- `simple-git-hooks` runs `bun lint-staged` on pre-commit
- Auto-fixes applied to staged files
