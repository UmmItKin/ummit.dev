import { makeOgSlugRoute } from '@/utils/og-image'

export const { getStaticPaths, GET } = makeOgSlugRoute('ctf', 'CTF Writeup')
