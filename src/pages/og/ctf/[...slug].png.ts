import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import { generateOgImage, ogResponse } from '@/utils/og-image'

export const getStaticPaths: GetStaticPaths = async () => {
  const ctfPosts = await getCollection('ctf')
  return ctfPosts.map(post => ({
    params: { slug: post.slug },
    props: { title: post.data.title },
  }))
}

export const GET: APIRoute = async ({ props }) => {
  const { title } = props as { title: string }
  const png = await generateOgImage('CTF Writeup', title)
  return ogResponse(png)
}
