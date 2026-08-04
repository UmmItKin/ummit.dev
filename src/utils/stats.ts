/**
 * Batch reader for listing pages.
 *
 * A listing can hold fifty posts, so fetching each counter on its own would
 * fire a hundred requests. batchGet takes every document in one round trip.
 */
export interface Stats {
  views: number
  likes: number
}

export async function fetchStats(
  batchUrl: string,
  dbRoot: string,
  ids: string[],
): Promise<Map<string, Stats>> {
  const out = new Map<string, Stats>()
  if (ids.length === 0) {
    return out
  }

  const documents = ids.flatMap(id => [
    `${dbRoot}/documents/views/${id}`,
    `${dbRoot}/documents/likes/${id}`,
  ])

  try {
    const res = await fetch(batchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents }),
    })
    if (!res.ok) {
      return out
    }

    // batchGet streams an array of { found } or { missing } entries, in any
    // order, so read the id back off each document name rather than by index.
    const rows = (await res.json()) as {
      found?: { name: string, fields?: { count?: { integerValue?: string } } }
    }[]

    for (const row of rows) {
      if (!row.found) {
        continue
      }
      const parts = row.found.name.split('/')
      const id = parts[parts.length - 1]
      const kind = parts[parts.length - 2]
      const n = Number(row.found.fields?.count?.integerValue ?? 0)
      const prev = out.get(id) ?? { views: 0, likes: 0 }
      if (kind === 'views') {
        prev.views = Number.isFinite(n) ? n : 0
      }
      if (kind === 'likes') {
        prev.likes = Number.isFinite(n) ? n : 0
      }
      out.set(id, prev)
    }
  }
  catch {
    // Offline or blocked: callers leave the slots blank.
  }
  return out
}
