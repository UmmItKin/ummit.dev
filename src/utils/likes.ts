import { increment, read } from './views'

const COOKIE = 'liked-posts'
const ONE_YEAR = 60 * 60 * 24 * 365

function readCookie(): string[] {
  const row = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE}=`))
  if (!row) {
    return []
  }
  try {
    return JSON.parse(decodeURIComponent(row.slice(COOKIE.length + 1))) as string[]
  }
  catch {
    return []
  }
}

function writeCookie(ids: string[]): void {
  const value = encodeURIComponent(JSON.stringify(ids))
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`
}

export function hasLiked(id: string): boolean {
  return readCookie().includes(id)
}

/**
 * Likes are one way: once given they cannot be taken back. The cookie is only
 * written after Firestore confirms, so a failed request cannot leave the
 * button looking liked when nothing was recorded.
 */
export async function addLike(commitUrl: string, docPath: string): Promise<number | null> {
  if (hasLiked(docPath)) {
    return null
  }
  try {
    const count = await increment(commitUrl, docPath, 1)
    if (count === null) {
      return null
    }
    writeCookie([...readCookie(), docPath])
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
