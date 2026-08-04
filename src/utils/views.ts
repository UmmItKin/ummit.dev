const KEY = 'viewed-posts'

/** Count one view per post per session, so a refresh does not inflate it. */
export function isFreshView(id: string): boolean {
  try {
    const seen = JSON.parse(sessionStorage.getItem(KEY) || '[]') as string[]
    if (seen.includes(id)) {
      return false
    }
    sessionStorage.setItem(KEY, JSON.stringify([...seen, id]))
    return true
  }
  catch {
    // Private mode or storage disabled: still show a count, just do not dedupe.
    return true
  }
}

/**
 * Atomic server-side increment, so two readers arriving at once cannot
 * clobber each other the way a read-then-write would.
 */
async function increment(commitUrl: string, docPath: string): Promise<number | null> {
  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          transform: {
            document: docPath,
            fieldTransforms: [{ fieldPath: 'count', increment: { integerValue: '1' } }],
          },
        },
      ],
    }),
  })
  if (!res.ok) {
    return null
  }
  const data = await res.json()
  const n = Number(data?.writeResults?.[0]?.transformResults?.[0]?.integerValue)
  return Number.isFinite(n) ? n : null
}

async function read(docUrl: string): Promise<number | null> {
  const res = await fetch(docUrl)
  if (!res.ok) {
    return null
  }
  const data = await res.json()
  const n = Number(data?.fields?.count?.integerValue ?? 0)
  return Number.isFinite(n) ? n : null
}

export async function fetchViews(
  commitUrl: string,
  docUrl: string,
  docPath: string,
): Promise<number | null> {
  try {
    return isFreshView(docPath) ? await increment(commitUrl, docPath) : await read(docUrl)
  }
  catch {
    // Offline or blocked: caller leaves the slot blank rather than showing 0.
    return null
  }
}
