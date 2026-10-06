const iterations = 600_000
const encoder = new TextEncoder()

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// Version 1: 16-byte salt, 12-byte IV, then ciphertext including the GCM tag.
export async function encryptPost(html: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(html))
  const bytes = new Uint8Array(29 + ciphertext.byteLength)
  bytes[0] = 1
  bytes.set(salt, 1)
  bytes.set(iv, 17)
  bytes.set(new Uint8Array(ciphertext), 29)
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
}

export async function decryptPost(payload: string, password: string) {
  const bytes = Uint8Array.from(atob(payload), char => char.charCodeAt(0))
  if (bytes[0] !== 1 || bytes.length < 45)
    throw new Error('Invalid encrypted post')
  const key = await deriveKey(password, bytes.slice(1, 17))
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(17, 29) },
    key,
    bytes.slice(29),
  )
  return new TextDecoder().decode(plaintext)
}
