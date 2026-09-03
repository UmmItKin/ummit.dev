import type { APIRoute, GetStaticPaths } from 'astro'
import { generateOgImage, ogResponse } from '@/utils/og-image'

// Section label and title for every static page's OG image.
const pages: Record<string, [string, string]> = {
  'blog': ['Page', 'Blog'],
  'ctf': ['Page', 'CTF Writeups'],
  'friends': ['Page', 'Friends'],
  'gear': ['Page', 'My Gear'],
  'index': ['Home', 'UmmIt Kin Personal Website'],
  'infosec': ['InfoSec', 'InfoSec'],
  'links': ['Page', 'Links'],
  'md-style': ['Page', 'Markdown Style'],
  'musings': ['Page', 'Musings'],
  'posts-props': ['Page', 'Posts Props'],
  'research': ['Page', 'Security Research'],
  'todo': ['Page', 'Todo'],
  'verify': ['Page', 'Verify'],
  'video': ['Page', 'Video'],
}

export const getStaticPaths: GetStaticPaths = () =>
  Object.entries(pages).map(([page, [section, title]]) => ({ params: { page }, props: { section, title } }))

export const GET: APIRoute = async ({ props }) => {
  const { section, title } = props as { section: string, title: string }
  return ogResponse(await generateOgImage(section, title))
}
