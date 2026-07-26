import type { SponsorConfig } from '@/types'

export const sponsor: SponsorConfig = {
  text: 'Support my work',
  subtitle: 'coffee fuels more CTF writeups, OSS, and zero-day hunting.',
  links: [
    {
      platform: 'GitHub Sponsors',
      href: 'https://github.com/sponsors/UmmItKin',
      icon: 'i-ri-github-fill',
      hoverColor: '#f472b6',
    },
    {
      platform: 'Buy Me a Coffee',
      href: 'https://buymeacoffee.com/ummitc',
      icon: 'i-simple-icons-buymeacoffee',
      hoverColor: '#fde047',
    },
  ],
}
