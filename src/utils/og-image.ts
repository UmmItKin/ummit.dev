import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import satori from 'satori'
import { html } from 'satori-html'
import sharp from 'sharp'
import { siteConfig } from '@/config'

const BIO = 'HKer, InfoSec enthusiast currently into Computer Forensics, Wireless Attack, Web Security, GNU/Linux, and Open source. Also hunting CVEs :D'

export async function generateOgImage(section: string, title: string) {
  const fontPath = join(process.cwd(), 'public', 'fonts')
  const [fontData, fontDataCJK] = await Promise.all([
    readFile(join(fontPath, 'Inter-Bold.ttf')),
    readFile(join(fontPath, 'noto-sc-bold.ttf')),
  ])

  const markup = html`
    <div
      style="
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: space-between;
        background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%);
        padding: 60px;
      "
    >
      <!-- Background decoration -->
      <div
        style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
          display: flex;
        "
      ></div>

      <!-- Header: Author info -->
      <div
        style="
          display: flex;
          flex-direction: column;
          gap: 8px;
        "
      >
        <span
          style="
            font-size: 36px;
            color: #ffffff;
            font-weight: 700;
          "
        >
          ${siteConfig.author}
        </span>
        <span
          style="
            font-size: 20px;
            color: rgba(255, 255, 255, 0.5);
            font-weight: 700;
            max-width: 700px;
          "
        >
          ${BIO}
        </span>
      </div>

      <!-- Footer: Section + Title -->
      <div
        style="
          display: flex;
          flex-direction: column;
          gap: 12px;
        "
      >
        <span
          style="
            font-size: 24px;
            color: rgba(255, 255, 255, 0.5);
            font-weight: 700;
          "
        >
          ${section}
        </span>
        <span
          style="
            font-size: 56px;
            font-weight: 700;
            font-family: 'Inter', 'Noto Sans SC';
            color: #ffffff;
            line-height: 1.2;
            max-width: 1000px;
            text-shadow: 0 4px 20px rgba(0,0,0,0.5);
          "
        >
          ${title}
        </span>
      </div>
    </div>
  `

  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        data: fontData,
        weight: 700,
        style: 'normal',
      },
      {
        name: 'Noto Sans SC',
        data: fontDataCJK,
        weight: 700,
        style: 'normal',
      },
    ],
  })

  return await sharp(Buffer.from(svg)).png().toBuffer()
}

export function ogResponse(png: Buffer) {
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
