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
 * Toggle the like and return the new total, or null if the write failed.
 * The cookie is only updated once Firestore confirms, so a failed request
 * cannot leave the button showing a like that was never recorded.
 */
export async function toggleLike(
  commitUrl: string,
  docPath: string,
): Promise<{ count: number, liked: boolean } | null> {
  const liked = hasLiked(docPath)
  try {
    const count = await increment(commitUrl, docPath, liked ? -1 : 1)
    if (count === null) {
      return null
    }
    const ids = readCookie()
    writeCookie(liked ? ids.filter(i => i !== docPath) : [...ids, docPath])
    return { count, liked: !liked }
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
