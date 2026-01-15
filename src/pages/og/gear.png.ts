import type { APIRoute } from 'astro'
import { generateOgImage, ogResponse } from '@/utils/og-image'

export const GET: APIRoute = async () => {
  const png = await generateOgImage('Page', 'My Gear')
  return ogResponse(png)
}
