import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

const ARTICLE_DIR = join(import.meta.dirname, '../src/content/Article')
const BLOG_DIR = join(import.meta.dirname, '../src/content/blog')

interface HugoFrontmatter {
  author?: string
  title: string
  tags?: string[]
  date: string
  lastmod?: string
  latemod?: string
  thumbnail?: string
  description?: string
  draft?: boolean
}

interface AstroFrontmatter {
  title: string
  description?: string
  date: string
  tag?: string
  draft?: boolean
  lang?: string
}

function parseFrontmatter(content: string): { frontmatter: HugoFrontmatter, body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    throw new Error('No frontmatter found')
  }

  const frontmatterStr = match[1]
  const body = match[2]

  // Parse YAML manually (simple parser for common cases)
  const frontmatter: Record<string, unknown> = {}
  const lines = frontmatterStr.split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1)
      continue

    // Normalize key to lowercase
    const key = line.slice(0, colonIndex).trim().toLowerCase()
    let value = line.slice(colonIndex + 1).trim()

    // Handle quoted strings
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1)
    }

    // Handle arrays like ["tag1", "tag2"]
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1)
      frontmatter[key] = arrayContent.split(',').map((item) => {
        item = item.trim()
        if ((item.startsWith('"') && item.endsWith('"')) || (item.startsWith('\'') && item.endsWith('\''))) {
          return item.slice(1, -1)
        }
        return item
      })
    }
    else if (value === 'true') {
      frontmatter[key] = true
    }
    else if (value === 'false') {
      frontmatter[key] = false
    }
    else {
      frontmatter[key] = value
    }
  }

  return { frontmatter: frontmatter as HugoFrontmatter, body }
}

function convertToAstroFrontmatter(hugo: HugoFrontmatter): AstroFrontmatter {
  const astro: AstroFrontmatter = {
    title: hugo.title,
    date: hugo.date,
  }

  // Convert tags array to single tag string
  if (hugo.tags && hugo.tags.length > 0) {
    astro.tag = hugo.tags.join(', ')
  }

  if (hugo.description) {
    astro.description = hugo.description
  }

  if (hugo.draft) {
    astro.draft = hugo.draft
  }

  astro.lang = 'en-US'

  return astro
}

function generateAstroFrontmatterString(frontmatter: AstroFrontmatter): string {
  const lines = ['---']

  lines.push(`title: "${frontmatter.title.replace(/"/g, '\\"')}"`)

  if (frontmatter.description) {
    lines.push(`description: "${frontmatter.description.replace(/"/g, '\\"')}"`)
  }

  lines.push(`date: ${frontmatter.date}`)

  if (frontmatter.tag) {
    lines.push(`tag: "${frontmatter.tag}"`)
  }

  if (frontmatter.draft) {
    lines.push(`draft: ${frontmatter.draft}`)
  }

  if (frontmatter.lang) {
    lines.push(`lang: ${frontmatter.lang}`)
  }

  lines.push('---')

  return lines.join('\n')
}

function getTargetPath(filePath: string): string {
  // Get the relative path from Article directory - keep the original structure
  const relativePath = relative(ARTICLE_DIR, dirname(filePath))
  return relativePath
}

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)

      if (entry.isDirectory()) {
        // Skip hidden directories and special directories
        if (!entry.name.startsWith('.') && entry.name !== 'update') {
          await walk(fullPath)
        }
      }
      else if (entry.name === 'index.md') {
        files.push(fullPath)
      }
    }
  }

  await walk(dir)
  return files
}

async function copyAssets(sourceDir: string, targetDir: string) {
  const entries = await readdir(sourceDir, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name)
    const targetPath = join(targetDir, entry.name)

    if (entry.isFile() && entry.name !== 'index.md') {
      // Copy images and other assets
      await cp(sourcePath, targetPath)
      console.log(`  Copied asset: ${entry.name}`)
    }
    else if (entry.isDirectory()) {
      // Recursively copy subdirectories (like images/)
      await cp(sourcePath, targetPath, { recursive: true })
      console.log(`  Copied folder: ${entry.name}/`)
    }
  }
}

async function migratePost(filePath: string): Promise<void> {
  const content = await readFile(filePath, 'utf-8')
  const targetPath = getTargetPath(filePath)

  if (!targetPath) {
    console.log(`Skipping: ${filePath} (no valid path)`)
    return
  }

  try {
    const { frontmatter: hugoFm, body } = parseFrontmatter(content)
    const astroFm = convertToAstroFrontmatter(hugoFm)
    const newFrontmatter = generateAstroFrontmatterString(astroFm)

    // Create the new content
    const newContent = `${newFrontmatter}\n${body}`

    // Create target directory - preserve original structure
    const targetDir = join(BLOG_DIR, targetPath)
    const targetFile = join(targetDir, 'index.md')

    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true })
    }

    // Write the markdown file
    await writeFile(targetFile, newContent, 'utf-8')

    // Copy any assets from the source directory
    const sourceDir = dirname(filePath)
    await copyAssets(sourceDir, targetDir)

    console.log(`✓ Migrated: ${targetPath}`)
  }
  catch (error) {
    console.error(`✗ Failed: ${filePath}`, error)
  }
}

async function main() {
  console.log('🚀 Starting Hugo to Astro migration...\n')

  // Find all markdown files
  const files = await findMarkdownFiles(ARTICLE_DIR)
  console.log(`Found ${files.length} posts to migrate\n`)

  // Migrate each post
  for (const file of files) {
    await migratePost(file)
  }

  console.log('\n✅ Migration complete!')
}

main().catch(console.error)
