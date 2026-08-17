import type { CompetitionEntry } from '@/types'

export const competitions: CompetitionEntry[] = [
  {
    name: 'DEF CON CTF Qualifiers 2026',
    date: 'May 22-24, 2026',
    team: 'IB2XD',
    division: '\u2014',
    placement: '26/686',
    details: '4,852',
  },
  {
    name: 'PolyU CTF 2026',
    date: 'Mar 6-8, 2026',
    team: 'HeapUnderFlow',
    division: 'Sub-degree',
    placement: '3/20',
    details: '11,427 / 36',
    subDetails: 'Global: 20/179',
  },
  {
    name: 'HITCON CTF 2025',
    date: 'Aug 22-24, 2025',
    team: 'ICEDTEA',
    division: '\u2014',
    placement: '29/717',
    subDetails: 'Taiwan Top 4',
  },
  {
    name: 'HKCERT CTF 2025',
    date: 'Dec 19-21, 2025',
    team: 'HeapUnderFlow',
    division: 'Open',
    placement: '29/597',
    details: '\u2014',
  },
]

export interface ContributionEntry {
  event: string
  role: string
}

export const contributions: ContributionEntry[] = [
  { event: 'No Hack No CTF 2025', role: 'Challenge Author, Website Design' },
  { event: 'No Hack No CTF 2026', role: 'Challenge Author, Website Design' },
  { event: 'THJCC 2026', role: 'Challenge Author' },
  { event: 'THJCC 2026 Summer', role: 'Challenge Author' },
]
