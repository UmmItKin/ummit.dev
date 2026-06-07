---
title: Posts Props
description: Reference for the supported frontmatter fields in posts and static pages.
---

## Blog-like collections

Applies to `blog`, `infosec`, `ctf`, `research`, `paper`, and `talks`.

| Field       | Required | Type                  | Default   | Description                                     |
| :---------- | :------- | :-------------------- | :-------- | :---------------------------------------------- |
| title       | Yes      | `string`              | —         | Title of the post.                              |
| date        | Yes      | `string \| Date`      | —         | Publication date (auto-formatted to locale).    |
| description | No       | `string`              | —         | Description shown in listings and SEO.          |
| lastmod     | No       | `string \| Date`      | —         | Last modified date (auto-formatted to locale).  |
| image       | No       | `{ src, alt }`        | —         | Hero image shown in post header and OG cards.   |
| duration    | No       | `string`              | —         | Estimated reading/viewing time (e.g. "5 min").  |
| lang        | No       | `string`              | `en-US`   | Article language code.                          |
| tag         | No       | `string`              | —         | Custom tag text displayed on the post.          |
| draft       | No       | `boolean`             | `false`   | When `true`, post is excluded from production.  |
| redirect    | No       | `string`              | —         | External URL to redirect to instead of content. |
| video       | No       | `boolean`             | `false`   | Marks the post as containing video content.     |

## Pages

Applies to static pages in `src/content/pages/`.

| Field       | Required | Type             | Description                            |
| :---------- | :------- | :--------------- | :------------------------------------- |
| title       | Yes      | `string`         | Title of the page.                     |
| description | No       | `string`         | Description for SEO and listings.      |
| image       | No       | `{ src, alt }`   | Hero image for the page.               |
