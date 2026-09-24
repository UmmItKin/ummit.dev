import type { ProfileConfig } from '@/types'

export const profile: ProfileConfig = {
  name: 'Kin =]',
  taglineIcon: 'i-simple-icons-linux',
  intro:
    'HKer into InfoSec, GNU/Linux, and <a class="prose-link" href="https://www.residentevil.com/requiem/en-us/" target="_blank" rel="noopener noreferrer">Resident Evil</a>. Mostly Computer Forensics, Wireless Attacks, and Web Security these days, plus the occasional CVE hunt :D',
  subtagline: 'Aspiring to become a professional Red Team operator.',
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
        href: 'https://heapunderflow.org',
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
        href: 'https://app.hackthebox.com/public/users/2099997',
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
        href: 'https://www.linux.org.hk/',
        title: 'HKLUG',
        subtitle: 'Community',
        description: 'I join Hong Kong Linux User Group meetups.',
        image: '/badges/hklug.png',
      },
    ],
    mbti: [
      {
        href: 'https://www.16personalities.com/intp-personality',
        title: 'INTP-T',
        subtitle: 'MBTI',
        description: 'Logician, turbulent variant. I take a system apart before I trust it.',
        icon: 'i-ri-brain-3-fill',
      },
    ],
    interests: [
      {
        href: 'https://www.residentevil.com/requiem/en-us/',
        title: 'Resident Evil',
        subtitle: 'Fan',
        description: 'Resident Evil fan since I was 5.',
        image: '/icons/umbrella-corp.webp',
      },
    ],
  },
}
