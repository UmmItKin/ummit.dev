---
paths:
  - "src/**/*.astro"
---

# Astro component gotchas

- Prettier is fragile inside conditional JSX fragments, inline `<script>` is plain JS not TS, and `} else {` formatting conflicts.
- **`try`/`catch` cannot be used in an inline `<script>` in a `.astro` file.** `format/prettier` wants `} catch {` on one line and `style/brace-style` wants it split, so the two rules deadlock and `lint:fix` cannot resolve it. A single-line `if (x) return` in the same position deadlocks the same way (`lint:fix` splits it and leaves a trailing space prettier then rejects) — restructure so the guard is unnecessary rather than fighting it. Since the pre-commit hook runs a build, this blocks commits. Move the logic into a `.ts` module under `src/utils/` and import it: there the repo's Allman style (`}` newline `catch {`) lints cleanly. `src/utils/share.ts`, `views.ts`, `likes.ts` and `build-status.ts` all exist for this reason.
- **Escapes like `'\u2014'` only work in JS string position.** Putting one in JSX text renders the literal characters `\u2014`. Use `{'\u2014'}` or paste the real character.
- **Client init scripts run on three triggers.** Anything that binds to post DOM calls its init once, again on `astro:page-load`, and again on `post:unlocked` if it touches post body content, because a locked post's body does not exist until decryption. Guard against double binding (`AiCopy` uses `dataset.bound`).
- **Deferred content needs two frames to animate in.** Set the text, then add the class inside `requestAnimationFrame`, otherwise the browser coalesces both into one paint and the transition never runs.
- Components are flat in `src/components/` — no subdirectories.
