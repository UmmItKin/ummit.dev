import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import { generateOgImage, ogResponse } from '@/utils/og-image'

export const getStaticPaths: GetStaticPaths = async () => {
  const paperPosts = await getCollection('paper')
  return paperPosts.map(post => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }))
}

export const GET: APIRoute = async ({ props }) => {
  const { title } = props as { title: string }
  const png = await generateOgImage('Paper', title)
  return ogResponse(png)
}
