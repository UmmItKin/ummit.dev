import type { ProjectData } from '@/types'

export const projectData: ProjectData = [
  {
    title: 'Platforms',
    projects: [
      {
        text: 'UmmItOS',
        description: 'A beautiful Arch Linux-based distribution, designed for Power User and purple enthusiasts!',
        icon: 'i-simple-icons-archlinux',
        href: 'https://docs.ummit.dev',
      },
      {
        text: 'Z2E',
        description: 'AI Powered Automated Penetration Testing Framework.',
        icon: 'i-ri-brain-3-fill',
        href: 'https://z2e.team',
      },
      {
        text: 'ummit.dev',
        description: 'A beautiful personal portfolio theme forked from the Vitesse theme with extended features',
        icon: 'i-ri-global-line',
        href: 'https://ummit.dev',
      },
      {
        text: 'ummit-dots',
        description: 'My personal dots, based on UmmItOS',
        icon: 'i-ri-terminal-box-line',
        href: 'https://github.com/UmmItKin/ummit-dots',
      },
    ],
  },

  {
    title: 'Security',
    projects: [
      {
        text: 'offensive-web',
        description: 'Your go-to resource for offensive web security techniques and tools',
        icon: 'i-ri-global-line',
        href: 'https://offensive.ummit.dev/',
      },
      {
        text: 'ct-go',
        description: 'CLI tool for grabbing CT logs from crt.sh',
        icon: 'i-ri-shield-line',
        href: 'https://github.com/UmmItKin/ct-go',
      },
      {
        text: 'SebBypass',
        description: 'Chrome extension to bypass Safe Exam Browser (SEB) restrictions when taking quizzes.',
        icon: 'i-ri-shield-line',
        href: 'https://github.com/UmmItKin/SebBypass',
      },
      {
        text: 'CVE-2025-55182-PoC',
        description: 'react2shell PoC with Go',
        icon: 'i-ri-bug-line',
        href: 'https://github.com/UmmItKin/CVE-2025-55182-PoC',
      },
    ],
  },

  {
    title: 'CTF',
    projects: [
      {
        text: 'CTFs-chal',
        description: 'All of my CTFs challenge source code.',
        icon: 'i-ri-terminal-box-line',
        href: 'https://github.com/UmmItKin/CTFs-chal',
      },
    ],
  },

  {
    title: 'Tools',
    projects: [
      {
        text: 'wg-cli',
        description: 'A minimal Bash wrapper around `wg-quick` for managing a WireGuard interface with built-in egress IP verification.',
        icon: 'i-ri-terminal-box-line',
        href: 'https://github.com/UmmItKin/wg-cli',
      },
      {
        text: 'Upptime',
        description: 'My server status monitor, powered by Upptime.',
        icon: 'i-ri-server-line',
        href: 'https://short.ummit.dev/upptime',
      },
      {
        text: 'ImageAgent',
        description: 'Simple CLI tool for generate images from Markdown prompts using the Gemini Image API (Nano Banana 2).',
        icon: 'i-ri-image-line',
        href: 'https://github.com/UmmItKin/ImageAgent',
      },
      {
        text: 'AutoGitPull',
        description: 'Tool for automatically pulling Git repository files via the Codeberg API',
        icon: 'i-ri-git-branch-line',
        href: 'https://github.com/UmmItKin/AutoGitPull',
      },
      {
        text: 'gdrive-subtitle',
        description: 'A simple tool to embed Google video subtitles into the video.',
        icon: 'i-ri-video-line',
        href: 'https://github.com/UmmItKin/gdrive-subtitle',
      },
      {
        text: 'CTF-dlers',
        description: 'A high-performance CLI tool for downloading challenges from CTFd platforms with concurrent processing.',
        icon: 'i-ri-download-2-line',
        href: 'https://github.com/UmmItKin/CTF-dlers',
      },
    ],
  },
]
