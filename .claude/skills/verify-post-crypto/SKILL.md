---
name: verify-post-crypto
description: Check the password-protected post encryption in src/utils/post-crypto.ts against generated inputs. Use before finishing any change to post-crypto.ts, password-post.ts or PasswordPost.astro, or to the payload format, key derivation, salt, IV or cipher. Proves the right password returns the post, a wrong password or an altered payload never unlocks it, and the stored payload does not contain or repeat the post text.
---

# Verify post encryption

Password-protected posts are encrypted at build time by `encryptPost` and decrypted in the reader's browser by `decryptPost`, both in `src/utils/post-crypto.ts`. The decrypted HTML is written straight into the page with `innerHTML`.

## What is checked

Each line is a promise and the harm if it breaks.

| Property | Promise | Harm if broken |
|---|---|---|
| ROUND TRIP | The correct password returns exactly the post that was encrypted | Readers with the password see a damaged or empty post |
| WRONG PASSWORD | No other password unlocks the post | Private content is readable without the password |
| TAMPER | Flipping any bit of the stored payload (version, salt, IV, ciphertext, tag) makes the unlock fail | Someone who can alter the page can inject script through `innerHTML` |
| TRUNCATION | A cut-off payload does not unlock | Same as tamper |
| NO LEAK | The payload does not contain the post text | Private content is readable in the page source |
| SALT AND IV | Two encryptions of the same post never share a salt and IV | Reusing them with AES-GCM lets an observer recover content across builds |

## Run it

```bash
bun test ./.claude/skills/verify-post-crypto/
```

About 10 seconds. No dependency: it uses Bun's built-in test runner and WebCrypto, and imports the real `encryptPost` and `decryptPost`. The leading `./` is required, without it Bun treats the argument as a name filter and finds nothing.

`10 pass, 0 fail` means all six properties held for 10 generated posts.

- `CASES=50 bun test ./.claude/skills/verify-post-crypto/` tries more posts (about 0.8 seconds each).
- `SEED=7 bun test ./.claude/skills/verify-post-crypto/` tries different ones. The default seed is 1, so a plain run is repeatable.

## Scope

This is testing with generated inputs, not a proof. No verifier runs on TypeScript that calls WebCrypto, so the check exercises the real functions instead of a hand-written model of them.

Covered, per run:

- 10 posts by default: an empty post, a 1-character post, a 200,000-character post, and the rest up to 3,000 characters, built from ASCII, HTML angle brackets, CJK, emoji and newlines
- passwords of 1 to 40 characters from the same alphabet
- three wrong passwords per post: last character changed, a trailing space added, case changed
- one random bit flipped in each of the five payload regions, and one random truncation

Not covered:

- Strength of the cipher, of PBKDF2 at 600,000 iterations, or of the passwords authors choose. AES-GCM and PBKDF2 are trusted as implemented by the runtime.
- Bun's WebCrypto standing in for the browser's. A browser-only difference would not show here.
- Whether plaintext reaches `dist/` some other way: through `PostLayout.astro`, the RSS feed, the table of contents, or an MDX bundle. That is a build-output question. Use the `verify-ummit` skill and grep `dist/` for a phrase from the post.
- The unlock form in `src/utils/password-post.ts`.
- Text with lone surrogates. `TextEncoder` replaces them, so such input would not round trip. Rendered Markdown never contains them.
- Every bit of every payload. One bit per region per post is sampled.

## Reading a failure

A failure prints the property name in capitals, a sentence saying what happened, and a JSON line:

```text
error: TAMPER ACCEPTED: flipping one bit in the version still unlocked the post
{"seed":1,"case":0,"htmlLength":0,"password":"...","byte":0,"bit":3}
```

`seed` and `case` identify the generated post. Rerun with the same `SEED` to get the same failure.

Decide which of these it is:

1. The change was not meant to alter behavior. The failure is a real bug in the change. Fix the code, not the check.
2. The change deliberately alters the payload format (a new version byte, different salt or IV length, a different cipher). The properties still have to hold. Update the `regions` offsets in `check.test.ts` to the new layout, keep every property, and rerun.
3. The failure is in the check itself (an exception from `atob`, an offset past the end). Compare the offsets in `check.test.ts` with the layout comment above `encryptPost`.

Never delete or loosen a property to get a pass. If a property no longer applies, say so to the user and let them decide.

## Confirm the check can still fail

After editing `check.test.ts`, make one scratch change to `src/utils/post-crypto.ts`, run the check, and expect the named failure. Then `git checkout -- src/utils/post-crypto.ts`.

| Scratch change | Expected failure |
|---|---|
| Remove `bytes[0] !== 1 \|\|` from `decryptPost` | TAMPER ACCEPTED, version |
| Replace `crypto.getRandomValues(new Uint8Array(16))` and the 12-byte one with plain `new Uint8Array(...)` | SALT AND IV REUSED |
| Replace `encoder.encode(password)` with `encoder.encode('k')` | WRONG PASSWORD ACCEPTED |
| Replace `encoder.encode(html)` with `encoder.encode(html.trim())` | ROUND TRIP BROKEN |

All four were caught when this skill was written.

## Coverage record

| Covered code | Checked by |
|---|---|
| `src/utils/post-crypto.ts`: `encryptPost`, `decryptPost`, `deriveKey`, payload layout (1 version byte, 16-byte salt, 12-byte IV, ciphertext with tag) | every property |

Sync commit: `f5adf17`. The check was confirmed to describe `post-crypto.ts` at this commit.

To see whether the code moved since:

```bash
git log --oneline f5adf17..HEAD -- src/utils/post-crypto.ts
```

If that prints commits, read them, confirm the layout offsets and the six properties still describe the code, run the check, and only then replace the sync commit above with the new one. Do not move it forward just because the check passes.
