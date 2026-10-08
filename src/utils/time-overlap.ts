// Logic for TimeOverlap.astro. Lives in a .ts module because inline .astro
// scripts cannot use try/catch (lint deadlock) and this file is cleaner to test.

const YOU_START = 8 // assumed visitor awake window (local hours)
const YOU_END = 0 // midnight (wraps)

function inRange(h: number, start: number, end: number): boolean {
  return start < end ? h >= start && h < end : h >= start || h < end
}

/** Current hour-of-day (0-23, fractional) in a given IANA timezone. */
function hourInTz(tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0)
  return (get('hour') % 24) + get('minute') / 60
}

/** UTC offset in whole hours for a timezone (east of UTC is positive). */
function offsetHours(tz: string): number {
  const now = new Date()
  const local = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  return Math.round((local.getTime() - now.getTime()) / 3600000)
}

function fmt(tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date())
}

export function renderTimeOverlap(el: HTMLElement): void {
  const myTz = el.dataset.tz || 'Asia/Hong_Kong'
  const myStart = Number(el.dataset.mystart ?? 10)
  const myEnd = Number(el.dataset.myend ?? 2)
  const youTz = new Intl.DateTimeFormat().resolvedOptions().timeZone
  const youCity = youTz.split('/').pop()?.replace(/_/g, ' ') ?? 'your time'

  const myOff = offsetHours(myTz)
  const youOff = offsetHours(youTz)

  // Count UTC hours where both people are awake.
  let overlap = 0
  for (let u = 0; u < 24; u++) {
    const myH = (u + myOff + 24) % 24
    const youH = (u + youOff + 24) % 24
    if (inRange(myH, myStart, myEnd) && inRange(youH, YOU_START, YOU_END))
      overlap++
  }

  const seg = (start: number, end: number) => {
    const span = ((end - start + 24) % 24) || 24
    return { left: `${(start / 24) * 100}%`, width: `${(span / 24) * 100}%` }
  }
  const me = seg(myStart, myEnd)
  const you = seg(YOU_START, YOU_END)

  const meFill = el.querySelector<HTMLElement>('.fill.me')
  if (meFill)
    Object.assign(meFill.style, { left: me.left, width: me.width })
  const youFill = el.querySelector<HTMLElement>('.fill.you')
  if (youFill)
    Object.assign(youFill.style, { left: you.left, width: you.width })
  const now = el.querySelector<HTMLElement>('.now')
  if (now)
    now.style.left = `${(hourInTz(youTz) / 24) * 100}%`

  const clock = (el.closest('.to-wrap') ?? el).querySelector('.clock')
  if (clock)
    clock.textContent = fmt(myTz)

  const overlapEl = el.querySelector('.overlap')
  if (overlapEl) {
    overlapEl.textContent = overlap >= 1
      ? `We overlap about ${overlap} hour${overlap === 1 ? '' : 's'} a day.`
      : 'Our days barely overlap.'
  }
  const where = el.querySelector('.where')
  if (where)
    where.textContent = `You're in ${youCity}, I'm in ${el.dataset.mylabel || 'Hong Kong'}.`
}
