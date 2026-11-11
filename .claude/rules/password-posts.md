---
paths:
  - "src/components/{PasswordPost,PostLayout,TableOfContents}.astro"
  - "src/utils/{post-crypto,password-post}.ts"
  - "src/pages/rss.xml.ts"
---

# Password-protected posts

`password: 'a-long-unique-passphrase'` in post frontmatter enables build-time encryption for `.md` files in the five post collections. `PasswordPost.astro` renders its slot to HTML and encrypts the body and TOC using `src/utils/post-crypto.ts` (PBKDF2-SHA-256, AES-256-GCM). Only ciphertext reaches the page. `password-post.ts` decrypts in the browser and emits `post:unlocked` to initialize the TOC and image effects.

- Do not pass passwords to client components or spread post data into feeds.
- RSS omits protected bodies; metadata and asset files remain public.
- MDX is rejected for protected posts to avoid content leaking through component bundles.
- Keep plaintext sources and build caches private, and deploy only `dist/`.
- When changing this feature, verify both a correct and a wrong password, and scan the build output for plaintext.
