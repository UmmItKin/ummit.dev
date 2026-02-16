---
name: ummit-dev
description: UmmIt.dev personal website and blog. Use when working with this Astro-based blog, managing content, styling with UnoCSS, or understanding the project architecture and conventions.
metadata:
  author: UmmIt Kin
  version: "2026.2.16"
  tech_stack: "Astro 5.17+, Vue 3.5+, UnoCSS 0.66+, TypeScript"
---

# UmmIt.dev Project Skill

> Complete reference for the UmmIt.dev personal website and blog project

UmmIt.dev is a high-performance personal website and blog focusing on cybersecurity, Linux tutorials, CTF writeups, and technical content. Built with Astro's islands architecture, Vue 3 for interactivity, and styled with UnoCSS atomic CSS framework.

## Project Overview

| Aspect | Details |
|--------|---------|
| **Framework** | Astro 5.17.1 (Static Site Generator) |
| **UI Library** | Vue 3.5.27 (for interactive components) |
| **Styling** | UnoCSS 0.66.0 (atomic CSS) |
| **Language** | TypeScript (strict mode enabled) |
| **Package Manager** | **Bun only** (never use npm/yarn) |
| **Build Target** | Static HTML with selective hydration |
| **Deployment** | GitHub Actions with Bun |

## Homepage Icon Colors & Assets

The homepage (`src/pages/index.astro`) uses color-coded icons and logos for different platforms:

**CTF Teams:**
- **ICEDTEA**: Custom logo from `src/assets/CTF/ICEDTEA.jpg`
- **HeapUnderFlow**: Blue stack overflow icon (`text-blue-500`)
- **NHNC CTF**: Logo from `src/assets/nhnc-logo.webp` (downloaded from CTFtime)
- **THJCC CTF**: Logo from `src/assets/thjcc-logo.png` (downloaded from thjcc.org)

**Hacking Platforms:**
- **TryHackMe**: Red icon (`text-[#C11111]`) - official brand color
- **HackTheBox**: Green icon (`text-[#9FEF00]`) - official brand color

**Creator:**
- **UmmItOS**: Logo from `src/assets/ummitos-logo.png` (GitHub avatar)

**Hunting:**
- **Zero-Day**: Red bug icon (`text-red-500`) - emphasizes danger

All platform logos should use official brand colors when available.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Header, Footer, BaseHead
│   ├── content/        # ListPosts, ListProjects, PostLayout
│   ├── ui/             # ScrollToTop, Sponsor
│   └── *.astro/*.vue   # Mix of static (Astro) and interactive (Vue)
├── content/            # Content collections (type-safe)
│   ├── blog/           # Technical articles (107+ posts)
│   ├── ctf/            # CTF writeups
│   ├── pages/          # Static pages
│   ├── talks/          # Presentations
│   └── config.ts       # Zod schemas for validation
├── pages/              # File-based routing
│   ├── blog/           # Blog listing and posts
│   ├── ctf/            # CTF writeups listing
│   ├── talks/          # Talks listing
│   ├── video.astro     # YouTube video collection
│   ├── projects/       # Project showcase
│   ├── index.astro     # Homepage
│   └── og/             # OG image generation
├── layouts/            # Page templates
├── styles/             # Global CSS and prose styles
├── utils/              # Utility functions
├── types.ts            # Global TypeScript types
└── site-config.ts      # Site configuration
```

## Content Management

### Content Collections

All content is managed through Astro's type-safe content collections defined in `src/content/config.ts`:

| Collection | Purpose | Schema Fields |
|------------|---------|---------------|
| `blog` | Technical articles | title, description, date, lastmod, tag (max 3), lang, draft, redirect |
| `ctf` | CTF writeups | Same as blog + security-focused tags |
| `talks` | Presentations | Same as blog |
| `pages` | Static pages | title, description, date |

### Frontmatter Requirements

**Every blog post must have:**
```yaml
---
title: "Clear, descriptive title"
description: "One sentence (10-20 words), SEO-friendly, no emojis"
date: 2024-01-01T00:00:00+0800
tag: "Tag1, Tag2, Tag3"  # Maximum 3 SEO-friendly tags
lang: en-US
---
```

**Optional fields:**
- `lastmod`: Update date for modified posts
- `duration`: Reading time (e.g., "5 min")
- `draft: true`: Hide from production
- `redirect`: External URL for redirected posts
- `image`: Custom OG image

### Tag Guidelines

**SEO-Friendly Tag Rules:**
1. **Maximum 3 tags** per post
2. **Mix broad and specific**: e.g., "Linux, LUKS, Encryption"
3. **Common keywords**: Use terms people actually search
4. **No long phrases**: "LUKS" not "LUKS Encryption Tutorial"

**Recommended Tags by Category:**
- **Linux**: Arch Linux, Ubuntu, System Administration, Installation
- **Security**: Encryption, LUKS, GPG, Password Management, Authentication
- **Development**: Git, Version Control, Hugo, Bun, Programming
- **Browser**: Firefox, Extensions, Privacy, Customization
- **Tools**: Vim, Terminal, CLI, GRUB, Boot Loader
- **Gaming**: Minecraft, Counter-Strike, Steam, Server Setup
- **Hardware**: ASUS, Intel, Storage, Router
- **InfoSec**: Penetration Testing, Aircrack, Metasploit, Cryptography
- **Mobile**: Android, Termux
- **Networking**: VPN, DNS, WireGuard

## Component Architecture

### When to Use Astro vs Vue

| Use Case | Component Type | Reason |
|----------|---------------|---------|
| Static content layout | `.astro` | Zero JavaScript, faster loading |
| Navigation menus | `.astro` | SEO-friendly, no interactivity needed |
| Content lists | `.astro` | Pre-rendered at build time |
| GitHub contribution graph | `.vue` | Interactive chart with reactivity |
| Scroll-to-top button | `.vue` | Client-side interactivity |
| Forms, animations | `.vue` | Requires JavaScript |

### Shared Components

**Available reusable components:**
- `<Sponsor />` - GitHub Sponsors button (used on index, projects pages)
- `<PostLayout />` - Article layout with back button
- `<ListPosts />` - Blog post listing with year separators
- `<ListProjects />` - Project showcase cards
- `<BaseHead />` - Common `<head>` tags, includes Umami analytics

## Styling with UnoCSS

### Design System

**Colors:**
- Background: `bg-main` → `#0d1117` (dark theme)
- Text: `text-main` → `#bbbbbb`
- Accent colors: `text-blue-400`, `text-green-400`, `text-purple-400`, `text-red-400`

**Typography:**
- Sans-serif: Inter font family
- Monospace: DM Mono (for code)
- Prose: Custom `.prose` class for article content

**Common Shortcuts:**
```css
nav-link: text-link opacity-70 hover:opacity-100 transition-opacity duration-200
hr-line: my-8 border-neutral-700/50
```

### Styling Patterns

**Navigation links:**
```astro
<a class="nav-link text-3xl font-bold opacity-80">Blog</a>
<a class="nav-link text-3xl font-bold opacity-30 hover:opacity-50">CTF</a>
```

**Cards with borders:**
```astro
<div class="p-4 rounded-lg bg-neutral-800/30 border border-neutral-700/50">
  <!-- content -->
</div>
```

**Responsive flexbox:**
```astro
<div class="flex flex-col sm:flex-row gap-2 sm:gap-4">
  <!-- items -->
</div>
```

## Special Features

### Level System

Located in `src/utils/level.ts`, displays writing achievement levels:

```typescript
interface LevelInfo {
  count: number
  level: string      // e.g., "Elite Chronicler"
  message: string    // Motivational message
}
```

**Tiers:**
- 0: Silent Observer
- 1-4: Rookie Writer
- 5-9: Apprentice Blogger
- 10-24: Skilled Writer
- 25-49: Seasoned Author
- 50-99: Master Storyteller
- 100-199: Elite Chronicler
- 200+: Legendary Sage

Used on Blog, CTF, Talks pages with "Since [Year]" feature.

### Video Collection

**File**: `src/pages/video.astro`

Simple list of YouTube videos (no embeds):
```typescript
const videos = [
  {
    title: 'Video Title',
    url: 'https://www.youtube.com/watch?v=VIDEO_ID',
    date: 'Nov 27, 2024',
    platform: 'YouTube',
  },
]
```

Auto-sorts by date (newest first).

### OG Image Generation

**Location**: `src/pages/og/*.png.ts`

Uses Satori to generate Open Graph images for social media sharing.

**Create new OG image:**
```typescript
// src/pages/og/video.png.ts
import type { APIRoute } from 'astro'
import { generateOgImage, ogResponse } from '@/utils/og-image'

export const GET: APIRoute = async () => {
  const png = await generateOgImage('Page', 'Video')
  return ogResponse(png)
}
```

### Umami Analytics

Integrated in `src/components/BaseHead.astro`:
```html
<script defer src="https://cloud.umami.is/script.js" 
  data-website-id="7e2c9847-d6a6-4449-bd8a-36a4c91e9666">
</script>
```

Tracks all pages automatically via BaseHead inclusion.

### Outdated Content Warnings

Articles show age warnings in `PostLayout.astro`:
- **6+ months**: Yellow warning
- **12+ months**: Orange alert
- **24+ months**: Red warning
- **36+ months**: Skull icon - "archaeological material"

Only applies to `blog` collection, not CTF/talks.

## Development Commands

**Always use Bun (never npm/yarn):**

```bash
bun dev          # Dev server (port 3199, fallback 3200)
bun run build    # Production build (126 pages)
bun preview      # Preview production build
bun lint         # ESLint check
bun lint:fix     # Auto-fix issues
bun release      # Bump version with bumpp
```

## Content Workflow

### Adding a New Blog Post

1. **Create file**: `src/content/blog/[Category]/[topic]/index.md`
2. **Add frontmatter**:
   ```yaml
   ---
   title: "Article Title"
   description: "SEO-friendly one-sentence description."
   date: 2024-02-13T10:00:00+0800
   tag: "Linux, LUKS, Encryption"
   lang: en-US
   ---
   ```
3. **Write content**: Use markdown with optional MDX features
4. **Add images**: Place in `src/assets/` or article directory
5. **Test locally**: `bun dev`
6. **Build**: `bun run build`
7. **Verify**: Check for build errors and OG image generation

### Updating Existing Posts

1. **Add `lastmod` field** in frontmatter
2. **Update content**
3. **Rebuild** to regenerate OG image if title changed

## Code Quality Standards

### TypeScript Rules

- **Strict mode enabled**: No `any` types allowed
- **Interface over type**: Use `interface` for objects
- **Explicit return types**: For exported functions
- **Props validation**: Use TypeScript interfaces for component props

### ESLint Configuration

Using `@antfu/eslint-config`:
- 2-space indentation
- Single quotes
- No semicolons (except where required)
- Trailing commas
- Vue 3 Composition API rules

### Component Patterns

**Astro component with props:**
```astro
---
interface Props {
  title: string
  description?: string
}

const { title, description } = Astro.props
---

<div>
  <h1>{title}</h1>
  {description && <p>{description}</p>}
</div>
```

**Vue component with composition API:**
```vue
<script setup lang="ts">
interface Props {
  total: number
  days: Array<{ count: number; date: string }>
}

const props = defineProps<Props>()
</script>

<template>
  <div>{{ total }} contributions</div>
</template>
```

## Performance Optimization

### Build Performance

- **Image optimization**: Automatic WebP conversion
- **Code splitting**: Per-page JavaScript bundles
- **Static generation**: Pre-rendered HTML
- **Selective hydration**: Only Vue components load JavaScript

### Current Build Stats

- **Pages**: 126 pages
- **Build time**: ~20 seconds
- **Image cache**: Reused across builds
- **Bundle size**: Minimal (mostly static HTML)

## Git Workflow

### Commit Conventions

Use conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `style:` - Formatting, styling
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Testing
- `chore:` - Maintenance

### Pre-commit Hooks

Configured with `simple-git-hooks`:
- Runs `bun lint:fix` before commit
- Ensures code quality

## Troubleshooting

### Common Issues

**Build fails with type errors:**
- Check all content frontmatter matches schema
- Verify all imports have correct paths
- Run `bun lint` to see detailed errors

**Images not optimizing:**
- Ensure images are in `src/assets/`
- Use Astro's `<Image>` component
- Check file extensions (.jpg, .png, .webp)

**UnoCSS classes not working:**
- Check `uno.config.ts` for custom shortcuts
- Verify class names are correct
- Use UnoCSS inspector in dev mode

**OG images not generating:**
- Check file exists: `src/pages/og/[page].png.ts`
- Verify `generateOgImage()` parameters
- Build and check `dist/og/` directory

## Site Configuration

**Main config**: `src/site-config.ts`

Key settings:
- Site metadata (title, description, author)
- Social links (GitHub, Twitter, email)
- Navigation links (Blog, CTF, Talks, Video)
- GitHub username for contributions graph

## Content Categories

| Category | Count | Focus Area |
|----------|-------|------------|
| Blog | 107+ | Linux, tools, development, hardware |
| CTF | Multiple | Security challenges, writeups |
| Talks | Multiple | Presentations, conference talks |
| Projects | Multiple | Open source projects, tools |

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/site-config.ts` | Site-wide configuration |
| `src/content/config.ts` | Content collection schemas |
| `src/types.ts` | Global TypeScript types |
| `uno.config.ts` | UnoCSS configuration and shortcuts |
| `astro.config.ts` | Astro framework configuration |
| `tsconfig.json` | TypeScript compiler options |
| `.eslintrc.js` | ESLint rules |
| `bun.lock` | Locked dependencies (Bun) |

## Best Practices Summary

### DO ✅
- Use Bun for all package management
- Add description to every blog post
- Limit tags to 3 SEO-friendly keywords
- Use Astro components for static content
- Use Vue components for interactivity
- Write TypeScript with strict mode
- Test builds locally before committing
- Use UnoCSS atomic classes
- Optimize images before adding
- Keep descriptions concise (10-20 words)

### DON'T ❌
- Use npm or yarn (Bun only)
- Add more than 3 tags per post
- Use emojis in descriptions
- Use `any` types in TypeScript
- Create large Vue components for static content
- Skip frontmatter validation
- Use custom CSS (prefer UnoCSS)
- Add unoptimized images
- Create files without reading existing ones first
- Use em-dashes (—) in descriptions

## Getting Started Checklist

For new contributors:
1. ✅ Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. ✅ Clone repo: `git clone https://github.com/UmmItKin/ummit.dev`
3. ✅ Install deps: `bun install`
4. ✅ Start dev: `bun dev`
5. ✅ Read AGENTS.md for project guidelines
6. ✅ Check existing content structure
7. ✅ Follow TypeScript strict mode
8. ✅ Use ESLint config
9. ✅ Test builds before committing

## Additional Resources

- **Astro Docs**: https://docs.astro.build
- **Vue 3 Docs**: https://vuejs.org
- **UnoCSS Docs**: https://unocss.dev
- **Project Guidelines**: `/AGENTS.md` in repo root
