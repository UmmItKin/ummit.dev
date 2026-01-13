import type { APIContext } from 'astro'
import rss from '@astrojs/rss'
import siteConfig from '@/site-config'
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
        ...item.data,
        link: `${context.site}/posts/${item.slug}/`,
        pubDate: new Date(item.data.date),
        content: item.body,
        author: `${siteConfig.author} <${siteConfig.email}>`,
      }
    }),
  })
}
