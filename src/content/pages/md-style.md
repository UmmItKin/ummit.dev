---
title: Markdown Style
description: A quick reference for how Markdown content is rendered on this site.
---

This page demonstrates all supported Markdown elements in the UmmIt theme. Use it as a reference when writing posts.

## Headings

### h3 — Section heading

#### h4 — Sub-section

##### h5 — Minor heading

###### h6 — Smallest heading

## Inline formatting

**Bold text** · _Italic text_ · **_Bold + italic_** · `inline code` · ~~strikethrough~~

[External link](https://ummit.dev) and [internal link](/verify).

## Blockquotes

> Single-line quote.

> Multi-paragraph blockquote.
>
> Second paragraph inside the same quote.

> Nested blockquotes are also supported:
>
> > Inner quote level.

## Lists

### Unordered

- Item one
- Item two
  - Nested item
  - Another nested item
- Item three

### Ordered

1. First step
2. Second step
   1. Sub-step A
   2. Sub-step B
3. Third step

### Task list

- [x] Completed task
- [ ] Pending task
- [ ] Another pending task

## Code

### Inline

Use backticks for `const x = 42` inline code.

### Fenced block with language

```ts
export const data = {
  name: 'Name',
  value: 'Value'
}

export function getName() {
  return data.name
}
```

### Fenced block without language

```
Plain preformatted text.
  Indentation is preserved.
```

## Tables

| Field       | Type     | Required | Description              |
| :---------- | :------- | :------- | :----------------------- |
| title       | string   | Yes      | Title of the article     |
| date        | Date     | Yes      | Publication date         |
| description | string   | No       | SEO and listing summary  |
| draft       | boolean  | No       | Exclude from production  |

## Horizontal rule

Above the line...

---

...below the line.

## Images

![Alt text](https://placehold.co/800x400/1a1a2e/ffffff?text=Example+Image)

## Video

Videos are supported via the `video: true` frontmatter flag. Embed using an `<iframe>` or `<video>` tag in your content.

## Links with preview cards

When linking to other posts or external sites in your content, the theme may render hover preview cards for supported link types.

## Frontmatter

Every post begins with YAML frontmatter between `---` fences:

```yaml
---
title: My Post Title
date: 2025-01-15
description: A short summary for SEO and listings
lastmod: 2025-06-01
image:
  src: /path/to/image.png
  alt: Description of the image
duration: 5 min
lang: en-US
tag: featured
draft: false
redirect: https://external-site.com/article
video: false
---
```

See [Posts Props](/posts-props) for the full field reference.
