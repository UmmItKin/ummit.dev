import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import { generateOgImage, ogResponse } from '@/utils/og-image'

export const getStaticPaths: GetStaticPaths = async () => {
  const talkPosts = await getCollection('talks')
  return talkPosts.map(post => ({
    params: { slug: post.slug },
    props: { title: post.data.title },
  }))
}

export const GET: APIRoute = async ({ props }) => {
  const { title } = props as { title: string }
  const png = await generateOgImage('Talk', title)
  return ogResponse(png)
}
