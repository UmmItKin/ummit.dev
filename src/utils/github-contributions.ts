export interface ContributionDay {
  date: string
  count: number
  level: number
}

export interface ContributionData {
  total: number
  days: ContributionDay[]
}

export async function fetchGitHubContributions(username: string): Promise<ContributionData | null> {
  try {
    const url = `https://github.com/users/${username}/contributions`
    const res = await fetch(url, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0',
      },
    })

    if (!res.ok)
      return null

    const html = await res.text()
    return parseContributionHtml(html)
  }
  catch {
    return null
  }
}

function parseContributionHtml(html: string): ContributionData {
  const days: ContributionDay[] = []

  const totalMatch = html.match(/([\d,]+)\s*contributions?\s+in the last year/i)
  const total = totalMatch ? Number.parseInt(totalMatch[1].replace(/,/g, ''), 10) : 0

  const cellRegex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"[^>]*class="ContributionCalendar-day"[^>]*>[\s\S]*?<\/td>\s*<tool-tip[^>]*>[^<]*<\/tool-tip>/g

  let match = cellRegex.exec(html)
  while (match) {
    const date = match[1]
    const level = Number.parseInt(match[2], 10)

    const tooltipText = match[0]
    const countMatch = tooltipText.match(/(\d+)\s+contributions?\s+on/)
    const count = countMatch ? Number.parseInt(countMatch[1], 10) : 0

    days.push({ date, count, level })
    match = cellRegex.exec(html)
  }

  days.sort((a, b) => a.date.localeCompare(b.date))

  return { total, days }
}
