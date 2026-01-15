import { defineCollection, z } from 'astro:content'

const pages = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    image: z
      .object({
        src: z.string(),
        alt: z.string(),
      })
      .optional(),
  }),
})

function dateTransform(val: string | number | Date) {
  return new Date(val).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Shared schema for blog-like collections (blog, talks, ctf)
const postSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  duration: z.string().optional(),
  image: z
    .object({
      src: z.string(),
      alt: z.string(),
    })
    .optional(),
  date: z
    .string()
    .or(z.date())
    .transform(dateTransform),
  lastmod: z
    .string()
    .or(z.date())
    .transform(dateTransform)
    .optional(),
  draft: z.boolean().default(false).optional(),
  lang: z.string().default('en-US').optional(),
  tag: z.string().optional(),
  redirect: z.string().optional(),
  video: z.boolean().default(false).optional(),
})

const blog = defineCollection({ schema: postSchema })
const talks = defineCollection({ schema: postSchema })
const ctf = defineCollection({ schema: postSchema })

export const collections = { pages, blog, talks, ctf }
