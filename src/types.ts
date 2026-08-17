import type { CollectionEntry } from 'astro:content'

export type PostKey = 'blog' | 'talks' | 'ctf' | 'research' | 'paper' | 'infosec'

export type CollectionPosts = CollectionEntry<PostKey>

export type Pages = 'pages'

export type CollectionPages = CollectionEntry<Pages>

export type ProjectData = Array<{
  title: string
  projects: Array<{
    text: string
    description?: string
    icon?: string
    href: string
  }>
}>

// ─── Config Types ──────────────────────────────────────────────

export interface NavLink {
  text: string
  href: string
}

export interface SocialLink {
  text: string
  href: string
  icon: string
  header?: string
}

// Profile / homepage
export interface Badge {
  href: string
  title: string
  subtitle: string
  description: string
  icon?: string
  image?: string
  color?: string
}

export interface ProfileConfig {
  name: string
  tagline?: string
  taglineIcon?: string
  intro: string
  subtagline?: string
  mbti?: string
  bio: string[]
  gpgKeyUrl?: string
  badges: {
    teams?: Badge[]
    challenges?: Badge[]
    platforms?: Badge[]
    projects?: Badge[]
    community?: Badge[]
    certifications?: Badge[]
  }
}

// Skills radar
export interface SkillItem {
  label: string
  value: number
}

// Competitions
export interface CompetitionEntry {
  name: string
  date: string
  team: string
  division?: string
  placement: string
  details?: string
  subDetails?: string
}

// Friends
export interface FriendEntry {
  name: string
  image: string
  url: string
  github: string
  tooltip?: string
}

// Links page
export interface LinkEntry {
  text: string
  href: string
  icon: string
}

// Gear
export interface GearItem {
  label: string
  value: string
}

export interface GearSection {
  title: string
  subtitle?: string
  icon: string
  items: GearItem[]
}

// Sponsor
export interface SponsorLink {
  platform: string
  href: string
  icon: string
  hoverColor?: string
}

export interface SponsorConfig {
  text: string
  subtitle?: string
  links: SponsorLink[]
}

// Analytics
export interface AnalyticsConfig {
  enabled: boolean
  provider?: 'umami' | 'plausible' | 'none'
  src?: string
  websiteId?: string
}

// Post view counter (Firestore REST API)
export interface ViewsConfig {
  enabled: boolean
  projectId: string
  collection: string
}

// Feature flags
export interface FeaturesConfig {
  sponsor: boolean
  githubContributions: boolean
  skills: boolean
  competitions: boolean
  stacks: boolean
  deadMansSwitch: boolean
}
