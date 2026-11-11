// Generated-input check for src/utils/post-crypto.ts. Run with:
//   bun test ./.claude/skills/verify-post-crypto/
// CASES=<n> changes how many generated posts are tried, SEED=<n> which ones.
import { expect, test } from 'bun:test'
import { decryptPost, encryptPost } from '../../../src/utils/post-crypto'

const CASES = Number(process.env.CASES ?? 10)
const SEED = Number(process.env.SEED ?? 1)

// mulberry32: small seeded generator, so a failing case can be replayed.
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Well-formed Unicode only: ASCII, HTML syntax, CJK, emoji. No lone surrogates.
function text(rand: () => number, length: number) {
  const ranges = [[0x20, 0x7E], [0x20, 0x7E], [0x3C, 0x3E], [0x4E00, 0x9FFF], [0x1F300, 0x1F5FF], [0x0A, 0x0A]]
  let out = ''
  for (let i = 0; i < length; i++) {
    const [lo, hi] = ranges[Math.floor(rand() * ranges.length)]
    out += String.fromCodePoint(lo + Math.floor(rand() * (hi - lo + 1)))
  }
  return out
}

const bytesOf = (payload: string) => Uint8Array.from(atob(payload), c => c.charCodeAt(0))
const payloadOf = (bytes: Uint8Array) => btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))

async function unlocks(payload: string, password: string) {
  try {
    return { html: await decryptPost(payload, password) }
  }
  catch {
    return null
  }
}

function fail(message: string, detail: object): never {
  throw new Error(`${message}\n${JSON.stringify({ seed: SEED, ...detail })}`)
}

// Sizes always include the empty post (shortest legal payload, 45 bytes) and a large one.
const sizes = (i: number, rand: () => number) => [0, 1, 200_000][i] ?? Math.floor(rand() * 3000)

for (let i = 0; i < CASES; i++) {
  test(`generated post ${i} (seed ${SEED})`, async () => {
    const rand = rng(SEED * 1000 + i)
    const html = text(rand, sizes(i, rand))
    const password = text(rand, 1 + Math.floor(rand() * 40))
    const payload = await encryptPost(html, password)
    const bytes = bytesOf(payload)
    const at = { case: i, htmlLength: html.length, password }

    // ROUND TRIP: the right password gives back exactly the post that was encrypted.
    const opened = await unlocks(payload, password)
    if (opened?.html !== html)
      fail('ROUND TRIP BROKEN: the correct password did not return the original post', at)

    // WRONG PASSWORD: a different password never unlocks the post.
    const wrong = password.slice(0, -1) + (password.endsWith('x') ? 'y' : 'x')
    for (const guess of [wrong, `${password} `, password.toUpperCase() === password ? `${password}a` : password.toUpperCase()]) {
      if (await unlocks(payload, guess))
        fail('WRONG PASSWORD ACCEPTED: a password other than the real one unlocked the post', { ...at, guess })
    }

    // TAMPER: changing any part of the stored payload makes the unlock fail.
    // The unlocked HTML goes straight into innerHTML, so an accepted change is script injection.
    const regions = { version: [0, 1], salt: [1, 17], iv: [17, 29], ciphertext: [29, bytes.length - 16], tag: [bytes.length - 16, bytes.length] }
    for (const [region, [from, to]] of Object.entries(regions)) {
      if (to <= from)
        continue
      const index = from + Math.floor(rand() * (to - from))
      const bit = Math.floor(rand() * 8)
      const changed = bytes.slice()
      changed[index] ^= 1 << bit
      if (await unlocks(payloadOf(changed), password))
        fail(`TAMPER ACCEPTED: flipping one bit in the ${region} still unlocked the post`, { ...at, byte: index, bit })
    }
    const cut = Math.floor(rand() * bytes.length)
    if (await unlocks(payloadOf(bytes.slice(0, cut)), password))
      fail('TRUNCATION ACCEPTED: a cut-off payload still unlocked', { ...at, keptBytes: cut })

    // NO LEAK: the payload does not contain the post, and never repeats.
    const raw = new TextDecoder('latin1').decode(bytes)
    const sample = html.slice(0, 24)
    if (sample.length >= 8 && (payload.includes(sample) || raw.includes(sample)))
      fail('PLAINTEXT IN PAYLOAD: the stored payload contains readable post text', at)
    const again = bytesOf(await encryptPost(html, password))
    if (payloadOf(again.slice(1, 29)) === payloadOf(bytes.slice(1, 29)))
      fail('SALT AND IV REUSED: two encryptions of the same post share a salt and IV', at)

    expect(bytes[0]).toBe(1)
  }, 120_000)
}
