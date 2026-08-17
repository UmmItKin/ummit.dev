import { makeOgSlugRoute } from '@/utils/og-image'

export const { getStaticPaths, GET } = makeOgSlugRoute('paper', 'Paper')
