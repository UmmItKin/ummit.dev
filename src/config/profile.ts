import type { ProfileConfig } from '@/types'

export const profile: ProfileConfig = {
  name: 'Kin =]',
  taglineIcon: 'i-simple-icons-linux',
  intro:
    'HKer, InfoSec enthusiast currently into Computer Forensics, Wireless Attack, Web Security, GNU/Linux, and Open source. Also hunting CVEs :D',
  subtagline: 'Aspiring to become a professional Red Team operator.',
  mbti: 'INTP-T',
  gpgKeyUrl: 'https://github.com/UmmItKin.gpg',
  bio: [
    'I\u2019ve been self-taught since I was a kid. Right now I\'m studying InfoSec in Hong Kong, and the stuff I keep coming back to is red teaming, reverse engineering, and web hacking. I started taking this seriously around middle school. HTML, CSS, JavaScript first, then C#, VB.NET, a few others. I don\'t really touch those anymore. Lately it\'s web hacking and red team work.',
    'I\'m a huge GNU/Linux enthusiast. I\'ve tried at least 20 different distros over the years. My main system is Arch Linux, seven years and counting. Yes, I\'m still a student with over seven years of experience. I started back in secondary school. Right now I\'m running my own Arch-based distribution called UmmItOS, named after my internet nickname. XD',
    'I used to be a Windows user, but I\'m now 100% on GNU/Linux. I only touch Windows when I\'m attacking Active Directory. Lots of stories from the journey ... this is just a small part :D',
  ],
  badges: {
    teams: [
      {
        href: 'https://ic3dt3a.org/',
        title: 'ICEDTEA',
        subtitle: 'CTF Team',
        description: 'A Taiwan based CTF team that I am part of',
        image: '/badges/icedtea.jpg',
      },
      {
        href: 'https://ctftime.org/team/405936/',
        title: 'HeapUnderFlow',
        subtitle: 'CTF Team',
        description: 'My current Hong Kong based CTF team',
        image: '/badges/heapunderflow.webp',
      },
    ],
    challenges: [
      {
        href: 'https://ctftime.org/event/2818/',
        title: 'No Hack No CTF',
        subtitle: 'CTF Contributor',
        description: 'I created challenges and helped with the design side for No Hack No CTF.',
        image: '/badges/nhnc.webp',
      },
      {
        href: 'https://thjcc.org',
        title: 'THJCC CTF',
        subtitle: 'CTF Contributor',
        description: 'A Taiwai CTF event where I also contributed challenge-related work.',
        image: '/badges/thjcc.png',
      },
    ],
    platforms: [
      {
        href: 'https://tryhackme.com/p/UmmIt',
        title: 'TryHackMe',
        subtitle: 'Practice Platform',
        description: 'Used for rooms, labs, and certification tracks.',
        icon: 'i-simple-icons-tryhackme',
        color: '#C11111',
      },
      {
        href: 'https://app.hackthebox.com/users/2099997',
        title: 'HackTheBox',
        subtitle: 'Practice Platform',
        description: 'Used for labs, boxes, and web exploitation practice.',
        icon: 'i-simple-icons-hackthebox',
        color: '#9FEF00',
      },
      {
        href: 'https://cryptohack.org/user/UmmIt/',
        title: 'CryptoHack',
        subtitle: 'Practice Platform',
        description: 'A platform I use for learning and practicing cryptography.',
        image: '/badges/cryptohack.png',
      },
    ],
    projects: [
      {
        href: 'https://docs.ummit.dev/',
        title: 'UmmItOS',
        subtitle: 'My Project',
        description: 'My own Arch-based distribution and personal Linux experiment.',
        image: '/badges/ummitos.png',
      },
    ],
    community: [
      {
        href: 'https://www.pycon.hk/',
        title: 'HKPUG',
        subtitle: 'Community',
        description: 'I join HKPUG activities and occasionally give talks there.',
        image: '/badges/hkpug.png',
      },
      {
        href: 'https://www.meetup.com/hong-kong-linux-user-group/',
        title: 'HKLUG',
        subtitle: 'Community',
        description: 'I join Hong Kong Linux User Group meetups.',
        image: '/badges/hklug.png',
      },
    ],
    certifications: [
      {
        href: 'https://www.offsec.com/courses/pen-200/',
        title: 'OSCP',
        subtitle: 'Offensive Security',
        description: 'Offensive Security Certified Professional - Advanced penetration testing certification.',
        image: '/badges/oscp.webp',
      },
      {
        href: 'https://academy.hackthebox.com/preview/certifications/htb-certified-web-exploitation-specialist',
        title: 'CWES',
        subtitle: 'HackTheBox',
        description: 'Certified Web Exploitation Specialist - Advanced web application security certification.',
        image: '/badges/cwes.png',
      },
      {
        href: 'https://academy.hackthebox.com/preview/certifications/htb-certified-junior-cybersecurity-associate',
        title: 'CJCA',
        subtitle: 'HackTheBox',
        description: 'Certified Junior Cybersecurity Associate - Entry-level cybersecurity fundamentals.',
        image: '/badges/cjca.png',
      },
      {
        href: 'https://tryhackme.com/certification/junior-penetration-tester',
        title: 'PT1',
        subtitle: 'TryHackMe',
        description: 'Junior Penetration Tester - Foundational penetration testing skills certification.',
        image: '/badges/pt1.png',
      },
    ],
  },
}
