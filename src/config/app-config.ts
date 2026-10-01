import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { parse } from 'yaml'

// Root-level config.yaml is the single place to toggle site features without
// touching code. Read at build time; process.cwd() is the repo root during the
// Astro build, so the file is found without bundling it into the output.
interface AppConfig {
  deadManSwitch?: { enabled?: boolean, preview?: boolean }
}

const raw = (parse(readFileSync(join(process.cwd(), 'config.yaml'), 'utf8')) ?? {}) as AppConfig

export const deadManSwitch = {
  enabled: Boolean(raw.deadManSwitch?.enabled),
  preview: Boolean(raw.deadManSwitch?.preview),
}
