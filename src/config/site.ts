import type { NavLink, SocialLink } from '@/types'

export const siteConfig = {
  author: 'UmmIt Kin',
  github: 'UmmItKin',
  title: 'UmmIt Kin Personal website',
  subtitle: 'UmmIt Kin Personal website :)))))',
  description: 'The place where I share my thoughts and projects.',
  image: {
    src: '/avatar.webp',
    alt: 'Website Main Image',
  },
  email: 'root@ummit.dev',
  email_two: 'job.inquiry@lamkin.me',
  avatar: '/avatar.webp',
  siteStartedAt: '2023-10-20T16:57:50+0800',
  preconnect: ['https://links-rs.ummit.dev'] as string[],
  socialLinks: [
    {
      text: 'GitHub',
      href: 'https://github.com/UmmItKin',
      icon: 'i-simple-icons-github',
      header: 'i-ri-github-line',
    },
    {
      text: 'Twitter',
      href: 'https://twitter.com/UmmItKin',
      icon: 'i-simple-icons-x',
      header: 'i-ri-twitter-x-line',
    },
    {
      text: 'Youtube',
      href: 'https://www.youtube.com/@UmmItKin',
      icon: 'i-simple-icons-youtube',
    },
  ] as SocialLink[],
  header: {
    logo: {
      src: '/avatar.webp',
      alt: 'Logo Image',
    },
    navLinks: [
      { text: 'About', href: '/about' },
      { text: 'Blog', href: '/blog' },
      { text: 'Projects', href: '/projects' },
      { text: 'Friends', href: '/friends' },
      { text: 'Gear', href: '/gear' },
      { text: 'Links', href: '/links' },
    ] as NavLink[],
  },
  page: {
    blogLinks: [
      { text: 'Blog', href: '/blog' },
      { text: 'InfoSec', href: '/infosec' },
      { text: 'CTF', href: '/ctf' },
      { text: 'Research', href: '/research' },
      { text: 'Musings', href: '/musings' },
      { text: 'Video', href: '/video' },
    ] as NavLink[],
  },
  footer: {
    navLinks: [
      { text: 'Posts Props', href: '/posts-props' },
      { text: 'Markdown Style', href: '/md-style' },
      { text: 'Todo', href: '/todo' },
    ] as NavLink[],
  },
}

export default siteConfig
