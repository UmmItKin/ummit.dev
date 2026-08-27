import type { CompetitionEntry } from '@/types'

export const competitions: CompetitionEntry[] = [
  {
    name: 'DEF CON CTF Qualifiers 2026',
    href: 'https://bbbctf.com/',
    date: 'May 22-24, 2026',
    team: 'IB2XD',
    division: '\u2014',
    placement: '26/686',
    details: '4,852',
  },
  {
    name: 'PolyU CTF 2026',
    href: 'https://2026.polyuctf.com/',
    date: 'Mar 6-8, 2026',
    team: 'HeapUnderFlow',
    division: 'Sub-degree',
    placement: '3/20',
    details: '11,427 / 36',
    subDetails: 'Global: 20/179',
  },
  {
    name: 'HITCON CTF 2025',
    href: 'https://ctf2025.hitcon.org/',
    date: 'Aug 22-24, 2025',
    team: 'ICEDTEA',
    division: '\u2014',
    placement: '29/717',
    subDetails: 'Taiwan Top 4',
  },
  {
    name: 'HKCERT CTF 2025',
    href: 'https://www.hkcert.org/tc/event/hkcert-capture-the-flag-challenge-2025',
    date: 'Dec 19-21, 2025',
    team: 'HeapUnderFlow',
    division: 'Open',
    placement: '29/597',
    details: '\u2014',
  },
]

export interface ContributionEntry {
  event: string
  date: string
  role: string
  href?: string
}

export const contributions: ContributionEntry[] = [
  { href: 'https://ctftime.org/event/2818/', event: 'No Hack No CTF 2025', date: 'Jul 5-7, 2025', role: 'Challenge Author, Website Design' },
  { href: 'https://ctftime.org/event/3180/', event: 'No Hack No CTF 2026', date: 'Jul 4-6, 2026', role: 'Challenge Author, Website Design' },
  { href: 'https://ctf2026.thjcc.org/', event: 'THJCC 2026', date: 'Feb 21-22, 2026', role: 'Challenge Author' },
  { href: 'https://ctf2026-sum.thjcc.org/', event: 'THJCC 2026 Summer', date: 'Aug 15-16, 2026', role: 'Challenge Author' },
]
