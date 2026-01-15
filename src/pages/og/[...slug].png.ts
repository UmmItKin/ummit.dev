import type { APIRoute, GetStaticPaths } from 'astro'
import { generateOgImage, ogResponse } from '@/utils/og-image'
import { getPosts } from '@/utils/posts'

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPosts()
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { title: post.data.title },
  }))
}

export const GET: APIRoute = async ({ props }) => {
  const { title } = props as { title: string }
  const png = await generateOgImage('Blog', title)
  return ogResponse(png)
}
