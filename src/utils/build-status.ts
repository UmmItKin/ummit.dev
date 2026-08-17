// Compares the commit this build was cut from against the repo's latest commit.
// Returns 'fresh' | 'stale' | null (null when the check could not run).
export async function checkBuildFreshness(api: string, build: string): Promise<'fresh' | 'stale' | null> {
  try {
    const res = await fetch(api, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) {
      return null
    }
    const latest = (await res.json()).sha as string
    return latest === build ? 'fresh' : 'stale'
  }
  catch {
    // Offline or rate-limited.
    return null
  }
}
