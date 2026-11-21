import type { CollectionPosts, PostKey } from '@/types'
import { getCollection } from 'astro:content'

export function sortPostsByDate(itemA: CollectionPosts, itemB: CollectionPosts) {
  const a = new Date(itemA.data.dateRaw ?? itemA.data.date).getTime()
  const b = new Date(itemB.data.dateRaw ?? itemB.data.date).getTime()
  return b - a
}

export async function getPosts(path?: string, collection: PostKey = 'blog') {
  return (await getCollection(collection, (post) => {
    return (import.meta.env.PROD
      ? post.data.draft !== true
      : true) && (path
      ? post.id.includes(path)
      : true)
  })).sort(sortPostsByDate)
}
