import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

// Preserve original directory casing in IDs (default lowercases via github-slugger)
function generateId({ entry }: { entry: string }) {
  return entry.replace(/\.(md|mdx)$/, '').replace(/\/index$/, '')
}

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages', generateId }),
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

// Shared schema for blog-like collections (blog, talks, ctf, research, paper)
// Preprocess copies the raw `date` into `dateRaw` before the field transform
// below turns `date` into a display string that drops the time of day. The sort
// in posts.ts reads `dateRaw` so same-day posts stay in real chronological order.
const postSchema = z.preprocess(
  (val) => {
    if (val && typeof val === 'object' && 'date' in val && (val as { date?: unknown }).date != null) {
      return { ...(val as object), dateRaw: (val as { date: unknown }).date }
    }
    return val
  },
  z.object({
    title: z.string(),
    description: z.string().optional(),
    duration: z.string().optional(),
    image: z
      .object({
        src: z.string(),
        alt: z.string(),
      })
      .optional(),
    dateRaw: z
      .string()
      .or(z.date())
      .transform(val => new Date(val).toISOString())
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
  }),
)

function postCollection(base: string) {
  return defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base, generateId }),
    schema: postSchema,
  })
}

const blog = postCollection('./src/content/blog')
const talks = postCollection('./src/content/talks')
const ctf = postCollection('./src/content/ctf')
const research = postCollection('./src/content/research')
const paper = postCollection('./src/content/paper')
const infosec = postCollection('./src/content/infosec')

export const collections = { pages, blog, talks, ctf, research, paper, infosec }
