/**
 * Self-check for the share copy fallbacks. No test runner: run it with
 *   bunx tsx src/utils/share.test.ts   (or: bun src/utils/share.test.ts)
 * Exits non-zero on failure.
 */
import assert from 'node:assert'
import { copyText, legacyCopy } from './share'

interface FakeWin {
  isSecureContext: boolean
  getSelection: () => null
}

function setupDom(execResult: boolean | (() => boolean)) {
  const appended: string[] = []
  const removed: string[] = []
  const host = {
    appendChild: (el: { _tag: string }) => appended.push(el._tag),
  }
  const doc = {
    createElement: () => ({
      _tag: 'textarea',
      value: '',
      style: {} as Record<string, string>,
      setAttribute: () => {},
      focus: () => {},
      select: () => {},
      setSelectionRange: () => {},
      remove: () => removed.push('textarea'),
    }),
    execCommand: () => (typeof execResult === 'function' ? execResult() : execResult),
    createRange: () => ({ selectNodeContents: () => {} }),
  }
  globalThis.document = doc as unknown as Document
  return { appended, removed, host }
}

function setupWindow(secure: boolean, clipboard?: { writeText: (t: string) => Promise<void> }) {
  const win: FakeWin = { isSecureContext: secure, getSelection: () => null }
  globalThis.window = win as unknown as Window & typeof globalThis
  globalThis.navigator = { clipboard } as unknown as Navigator
}

async function run() {
  // legacyCopy reports success and always cleans up its textarea.
  {
    const { removed, host } = setupDom(true)
    setupWindow(false)
    assert.strictEqual(legacyCopy('x', host as unknown as HTMLElement), true)
    assert.deepStrictEqual(removed, ['textarea'], 'textarea must be removed on success')
  }

  // A throwing execCommand must not propagate, and must still clean up.
  {
    const { removed, host } = setupDom(() => {
      throw new Error('blocked')
    })
    setupWindow(false)
    assert.strictEqual(legacyCopy('x', host as unknown as HTMLElement), false)
    assert.deepStrictEqual(removed, ['textarea'], 'textarea must be removed after a throw')
  }

  // Non-secure origin has no clipboard API, so it must use the fallback.
  {
    const { host } = setupDom(true)
    setupWindow(false)
    assert.strictEqual(await copyText('x', host as unknown as HTMLElement), true)
  }

  // Secure origin prefers the async clipboard API.
  {
    const { host } = setupDom(false)
    let called = ''
    setupWindow(true, {
      writeText: async (t) => {
        called = t
      },
    })
    assert.strictEqual(await copyText('https://ummit.dev/', host as unknown as HTMLElement), true)
    assert.strictEqual(called, 'https://ummit.dev/', 'writeText must receive the url')
  }

  // A rejected writeText (permission denied) must fall back, not fail.
  {
    const { host } = setupDom(true)
    setupWindow(true, { writeText: async () => Promise.reject(new Error('denied')) })
    assert.strictEqual(
      await copyText('x', host as unknown as HTMLElement),
      true,
      'must fall back to execCommand when writeText rejects',
    )
  }

  // Both paths unavailable reports failure rather than throwing.
  {
    const { host } = setupDom(false)
    setupWindow(true, { writeText: async () => Promise.reject(new Error('denied')) })
    assert.strictEqual(await copyText('x', host as unknown as HTMLElement), false)
  }

  console.warn('share.ts: all checks passed')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
