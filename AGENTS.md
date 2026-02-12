# UmmIt.dev Personal Website & Blog

This is a high-performance personal website and blog built with Astro, Vue, TypeScript, and UnoCSS. The site focuses on cybersecurity content, technical tutorials, and personal projects.

## Project Architecture

### Technology Stack
- **Astro v5.17.1** - Static site generator with islands architecture
- **Vue 3.5.27** - Reactive components for interactive features
- **TypeScript** - Full type safety with strict mode enabled
- **UnoCSS 66.6.0** - Atomic CSS framework with comprehensive preset system
- **Bun** - Fast runtime and package manager (preferred over npm/yarn)
- **MDX** - Enhanced markdown with component support

### Project Structure
```
src/
├── components/          # Reusable UI components (Vue + Astro)
│   ├── layout/         # Header, Footer, BaseHead
│   ├── content/        # ListPosts, ListProjects, PostLayout
│   └── ui/             # ScrollToTop
├── content/            # Content collections (type-safe)
│   ├── blog/           # Main blog posts
│   ├── ctf/            # CTF writeups and cybersecurity content
│   ├── pages/          # Static pages content
│   ├── talks/          # Presentations and conference talks
│   └── config.ts       # Content collection schemas
├── pages/              # File-based routing
├── layouts/            # Page layout templates
├── styles/             # Global CSS and prose styles
├── utils/              # Utility functions and helpers
├── types.ts            # Global type definitions
└── site-config.ts      # Site-wide configuration
```

### Content Categories
- **Technical Blog Posts** - Linux tutorials, development guides, tool reviews
- **CTF Writeups** - Cybersecurity challenges and solutions
- **Project Showcases** - Personal projects and tools
- **Talks & Presentations** - Conference presentations and technical talks
- **Gear & Setup** - Hardware and software recommendations
- **Friends & Links** - Networking and curated resources

## Development Standards

### Code Quality
- **TypeScript strict mode** - All code must be type-safe
- **ESLint with @antfu/eslint-config** - Consistent code style
- **Pre-commit hooks** - Automated linting and formatting
- **Component architecture** - Clean separation between Vue (interactive) and Astro (static)

### Component Guidelines
- **Vue components** for interactive features (navigation, scroll-to-top)
- **Astro components** for static content (layouts, content lists, page structures)
- **TypeScript interfaces** for all component props
- **Composition API** preferred for Vue components
- **UnoCSS classes** for styling with design system consistency

### Content Management
- **Content collections** with strict TypeScript schemas
- **Frontmatter validation** for all content types
- **MDX support** for enhanced markdown with Vue components
- **Automated metadata** generation (dates, slugs, tags)
- **OG image generation** using Satori for social media

### Performance Requirements
- **Static generation** for optimal loading speed
- **Image optimization** with automatic WebP conversion
- **Code splitting** and efficient bundling
- **Minimal JavaScript** - only where interactivity is needed
- **SEO optimization** with structured data and meta tags

## Build & Deployment

### Package Manager
- **Use Bun exclusively** - Never use npm or yarn commands
- **Bun scripts** for all development tasks:
  ```bash
  bun dev          # Development server
  bun build        # Production build
  bun lint         # Code linting
  bun lint:fix     # Auto-fix linting issues
  ```

### Environment Setup
- **Arch Linux optimized** - Built and tested on Arch Linux
- **Node.js v25.4.0** - Latest LTS version
- **Bun 1.3.4** - Fast package management and runtime
- **Git hooks** configured with simple-git-hooks

### CI/CD Pipeline
- **GitHub Actions** with Bun support
- **Automated linting** on PRs and pushes
- **Release automation** with bumpp and changelogithub
- **Image optimization** in build pipeline

## Content Creation Guidelines

### Blog Posts
- **Technical accuracy** - All tutorials must be tested and verified
- **Clear structure** - Use headings, code blocks, and visual aids
- **Frontmatter required**:
  ```yaml
  title: Post Title
  publishDate: 2024-01-01
  description: SEO description
  tags: [tag1, tag2]
  ```

### CTF Writeups
- **Detailed methodology** - Explain approach and thought process
- **Code examples** - Include actual commands and scripts used
- **Flag protection** - Never include actual flags in public posts
- **Learning focus** - Emphasize educational value over just solutions

### Technical Content
- **Arch Linux focus** - Primary OS for tutorials and guides
- **Open source preference** - Favor FOSS tools and solutions
- **Practical examples** - Real-world scenarios and use cases
- **Security consciousness** - Always consider security implications

## Styling & Design System

### UnoCSS Configuration
- **Design tokens** defined in uno.config.ts shortcuts
- **Icon system** with 130+ preloaded icons from various icon sets
- **Dark/light theme** support with system preference detection
- **Responsive design** with mobile-first approach

### Component Styling
- **Atomic classes** preferred over custom CSS
- **Design shortcuts** for common patterns:

```
'bg-main': 'bg-hex-0d1117'
'text-main': 'text-hex-bbbbbb'
'nav-link': 'text-link opacity-70 hover:opacity-100 transition-opacity duration-200'
```

### Visual Consistency
- **Inter font family** for sans-serif text
- **DM Mono** for code and monospace content
- **Consistent spacing** using UnoCSS spacing scale
- **Dark theme only** - optimized for dark mode viewing

## Security & Best Practices

### Content Security
- **Static generation** minimizes attack surface
- **No user input** processing on the client side
- **Sanitized content** through MDX processing
- **CSP headers** for additional protection

### Dependency Management
- **Regular updates** via Bun and automated tools
- **Security audits** of dependencies
- **Minimal dependencies** - only include what's necessary
- **Lock file maintenance** with bun.lock

### Git Practices
- **Signed commits** when possible
- **Conventional commits** for clear history
- **Pre-commit validation** with hooks
- **Clean working tree** maintained

## Development Workflow

### Local Development
1. **Clone and setup**: `git clone && cd ummit.dev && bun install`
2. **Start dev server**: `bun dev` (runs on port 3199)
3. **Create content**: Add to appropriate collection in `src/content/`
4. **Test build**: `bun build` before committing
5. **Lint check**: `bun lint:fix` to ensure code quality

### Content Workflow
1. **Draft in markdown** with proper frontmatter
2. **Add images** to `src/assets/` with optimization
3. **Preview locally** with dev server
4. **Review and edit** for clarity and accuracy
5. **Commit and push** to trigger deployment

### Release Process
- **Version bumping** with `bun release` (uses bumpp)
- **Automated changelogs** via changelogithub
- **Git tag creation** for version tracking
- **GitHub releases** with automated notes

## Special Considerations

### Performance Optimization
- **Astro islands** for selective hydration
- **View Transition API** for smooth page transitions
- **Prefetch strategies** configured for optimal UX
- **Image lazy loading** and WebP conversion
- **Bundle analysis** and optimization

### Accessibility
- **ARIA labels** on interactive elements
- **Keyboard navigation** support
- **Screen reader compatibility**
- **Color contrast compliance** (WCAG AA)
- **Semantic HTML structure**

### SEO & Discovery
- **Structured data** markup for rich snippets
- **Open Graph** images auto-generated
- **XML sitemap** generation
- **RSS feeds** for content syndication
- **Meta tag optimization** for each page type

## Error Handling & Debugging

### Common Issues
- **Build failures** - Check TypeScript errors and missing dependencies
- **Style issues** - Verify UnoCSS configuration and class names
- **Content errors** - Validate frontmatter against collection schemas
- **Image problems** - Ensure proper paths and formats

### Debugging Tools
- **Astro dev tools** for component inspection
- **Browser DevTools** for client-side debugging
- **TypeScript compiler** for type checking
- **ESLint output** for code quality issues

## Team Guidelines

### Code Review
- **Type safety** - No `any` types allowed
- **Performance impact** - Consider bundle size and loading speed
- **Accessibility** - Test with screen readers and keyboard navigation
- **Mobile responsiveness** - Test on various device sizes
- **SEO implications** - Verify meta tags and structured data

### Documentation
- **Component documentation** with JSDoc comments
- **README updates** for significant changes
- **Changelog maintenance** for release notes
- **API documentation** for utility functions

This project represents a modern, high-performance approach to personal websites and technical blogging, emphasizing developer experience, content quality, and user performance.
