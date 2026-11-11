---
paths:
  - "src/components/{SkillRadar,DeadManSwitch}.vue"
  - "src/components/{ConferenceHeatmap,Footer}.astro"
  - "src/components/dead-man-message.md"
  - "src/config/app-config.ts"
  - "src/utils/build-status.ts"
  - "src/layouts/BaseLayout.astro"
  - "config.yaml"
---

# Component notes

- `SkillRadar.vue` — do not modify; user maintains it manually.
- `DeadManSwitch.vue` — toggled from the root `config.yaml` (`deadManSwitch.enabled`/`preview`/`days`), loaded via `src/config/app-config.ts` (a `?raw` import so dev HMR tracks it) and read in `BaseLayout.astro`. Message is authored in `src/components/dead-man-message.md` and slotted in; `:deep()` styles reach the slotted markdown. Currently enabled with a 50-day threshold.
- `ConferenceHeatmap.astro` — month grid + hover card for `src/config/conferences.ts`. Its card is `position: fixed` and placed by an inline script reading `getBoundingClientRect()`, because an absolute card gets pinned to the ~240px grid instead of tracking the cell. Do not wrap it in a `container-type` element or an `overflow` container: layout containment makes that element the containing block for fixed descendants, and the script's viewport coordinates then land in the wrong place.
- `Footer.astro` build stamp — bakes the build commit via `execSync('git rev-parse HEAD')` in frontmatter (build-time), then the client compares it against the GitHub commits API to show up-to-date/stale. Compare logic lives in `src/utils/build-status.ts` (a `.ts` file, not the inline script, because of the `try`/`catch` lint deadlock).
