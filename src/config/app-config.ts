import { parse } from 'yaml'
// Import the raw text so Vite tracks the file: editing config.yaml hot-reloads
// the dev server, and the content is bundled so no runtime fs read is needed.
import rawConfig from '../../config.yaml?raw'

interface AppConfig {
  deadManSwitch?: { enabled?: boolean, preview?: boolean, days?: number }
}

const raw = (parse(rawConfig) ?? {}) as AppConfig

export const deadManSwitch = {
  enabled: Boolean(raw.deadManSwitch?.enabled),
  preview: Boolean(raw.deadManSwitch?.preview),
  days: Number(raw.deadManSwitch?.days) || 30,
}
