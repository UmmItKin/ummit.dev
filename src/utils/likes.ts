import { increment, read } from './views'

const COOKIE = 'liked-posts'
const ONE_YEAR = 60 * 60 * 24 * 365

function readCookie(): string[] {
  const row = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE}=`))
  if (!row) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(row.slice(COOKIE.length + 1)))
    // The cookie is client-editable, so accept only a list of strings.
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : []
  }
  catch {
    return []
  }
}

function writeCookie(ids: string[]): void {
  const value = encodeURIComponent(JSON.stringify(ids))
  const secure = location.protocol === 'https:'
    ? '; Secure'
    : ''
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${ONE_YEAR}; SameSite=Lax${secure}`
}

export function hasLiked(id: string): boolean {
  return readCookie().includes(id)
}

export async function addLike(commitUrl: string, docPath: string): Promise<number | null> {
  if (hasLiked(docPath)) {
    return null
  }
  try {
    const count = await increment(commitUrl, docPath, 1)
    if (count === null) {
      return null
    }
    writeCookie([
      ...readCookie(),
      docPath,
    ])
    return count
  }
  catch {
    return null
  }
}

export async function readLikes(docUrl: string): Promise<number | null> {
  try {
    return await read(docUrl)
  }
  catch {
    return null
  }
}
