import type { APIContext } from 'astro'

export function GET(context: APIContext) {
  const siteUrl = context.site?.href ?? 'https://ummit.dev/'
  const robots = `
User-agent: *
Allow: /
  
Sitemap: ${new URL('sitemap-index.xml', siteUrl).href}`.trim()

  return new Response(robots, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
