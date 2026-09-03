import { views as config } from '@/config/views'

const KEY = 'viewed-posts'

const API = 'https://firestore.googleapis.com/v1'
const DB_ROOT = `projects/${config.projectId}/databases/(default)`

/** Firestore document ids reject '/', so nested post ids get flattened. */
export function docRefs(collection: string, id: string) {
  const docPath = `${DB_ROOT}/documents/${collection}/${id.replace(/\//g, '_')}`
  return { docPath, docUrl: `${API}/${docPath}`, commitUrl: `${API}/${DB_ROOT}/documents:commit` }
}

/** Listing pages read every counter on the page in one batchGet. */
export const batchRefs = { dbRoot: DB_ROOT, batchUrl: `${API}/${DB_ROOT}/documents:batchGet` }

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
export async function increment(
  commitUrl: string,
  docPath: string,
  by: number = 1,
): Promise<number | null> {
  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          transform: {
            document: docPath,
            fieldTransforms: [{ fieldPath: 'count', increment: { integerValue: String(by) } }],
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

export async function read(docUrl: string): Promise<number | null> {
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
