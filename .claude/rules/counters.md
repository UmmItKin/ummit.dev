---
paths:
  - "src/utils/{views,likes,stats}.ts"
  - "src/components/{ViewCounter,LikeButton,ListPosts}.astro"
  - "src/config/views.ts"
  - "docs/firestore.rules"
---

# View and like counters

The site is static SSG with no server, so both counters talk to the **Firestore REST API** directly from the browser. No Firebase SDK, no dependency, no API key: `src/config/views.ts` holds only `enabled` and `projectId`, and the project id is public by design and ships in every page's HTML.

- **`views` and `likes` are separate Firestore collections.** Document ids are post ids with `/` replaced by `_`, since Firestore rejects `/` in ids.
- **Build the REST urls with `docRefs(collection, id)` / `batchRefs` from `src/utils/views.ts`**, never by hand. `ViewCounter`, `LikeButton` and `ListPosts` all go through them, so the write path and the read path cannot drift apart.
- **Writes use `fieldTransforms` with `increment`**, which is atomic server-side. A read-then-write would lose counts when two people open a post at once.
- **`docs/firestore.rules` is the only access control**, and nothing deploys it: paste it into the Firebase console by hand. The endpoint is public and unauthenticated, so the rules must stay restrictive: `+1` only, `count` field only, everything outside the two collections closed. Allowing `-1` would let anyone script a count down to zero, which is why likes are one way.
- **Listing pages use `batchGet`** (`src/utils/stats.ts`), one request for the whole page instead of two per post. **The response order does not match the request order**, so read the id back off each `found.name` rather than by index.
- Views increment once per session (`sessionStorage`); likes are one way and remembered in a cookie. Both are client-side, so clearing storage lets a visitor count again. Preventing that needs real auth.
- A missing document reads as `null`. Likes show that as `0`; views leave it blank, because a view is written on load so `null` there means the fetch actually failed.
