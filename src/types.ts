import type { CollectionEntry } from 'astro:content'

export type PostKey = 'blog' | 'musings' | 'ctf' | 'research' | 'infosec'

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
  bio: string[]
  gpgKeyUrl?: string
  badges: {
    teams?: Badge[]
    challenges?: Badge[]
    platforms?: Badge[]
    projects?: Badge[]
    community?: Badge[]
    mbti?: Badge[]
    interests?: Badge[]
  }
}

export interface SkillItem {
  label: string
  value: number
}

export interface CompetitionEntry {
  name: string
  href?: string
  date: string
  team: string
  division?: string
  placement: string
  details?: string
  subDetails?: string
}

export interface ConferenceEntry {
  event: string
  detail?: string
  image?: string
  date: string
  dateEnd?: string
  role: string
  href?: string
}

export interface FriendEntry {
  name: string
  image: string
  url: string
  github: string
  tooltip?: string
}

export interface LinkEntry {
  text: string
  href: string
  icon: string
}

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

export interface AnalyticsConfig {
  enabled: boolean
  src?: string
  websiteId?: string
}

export interface ViewsConfig {
  enabled: boolean
  projectId: string
}

export interface FeaturesConfig {
  sponsor: boolean
  githubContributions: boolean
  skills: boolean
  competitions: boolean
  conferences: boolean
  stacks: boolean
}
