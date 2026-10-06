import type { APIContext } from 'astro'
import rss from '@astrojs/rss'
import { siteConfig } from '@/config'
import { getPosts } from '@/utils/posts'

export async function GET(context: APIContext) {
  const posts = await getPosts()
  const siteUrl = context.site?.href ?? 'https://ummit.dev/'

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: siteUrl,
    items: posts!.map((item) => {
      return {
        title: item.data.title,
        description: item.data.description,
        link: `${context.site}/posts/${item.id}/`,
        pubDate: new Date(item.data.date),
        content: item.data.password ? undefined : item.body,
        author: `${siteConfig.author} <${siteConfig.email}>`,
      }
    }),
  })
}
