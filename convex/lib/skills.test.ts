import { describe, expect, it } from 'vitest'
import {
  buildEmbeddingText,
  isTextFile,
  parseClawdisMetadata,
  parseFrontmatter,
  sanitizePath,
} from './skills'

describe('skills utils', () => {
  it('parses frontmatter', () => {
    const frontmatter = parseFrontmatter(`---\nname: demo\ndescription: Hello\n---\nBody`)
    expect(frontmatter.name).toBe('demo')
    expect(frontmatter.description).toBe('Hello')
  })

  it('parses clawdis metadata', () => {
    const frontmatter = parseFrontmatter(
      `---\nmetadata: {"clawdis":{"requires":{"bins":["rg"]},"emoji":"🦞"}}\n---\nBody`,
    )
    const clawdis = parseClawdisMetadata(frontmatter)
    expect(clawdis?.emoji).toBe('🦞')
    expect(clawdis?.requires?.bins).toEqual(['rg'])
  })

  it('sanitizes file paths', () => {
    expect(sanitizePath('good/file.md')).toBe('good/file.md')
    expect(sanitizePath('../bad/file.md')).toBeNull()
    expect(sanitizePath('')).toBeNull()
  })

  it('detects text files', () => {
    expect(isTextFile('SKILL.md')).toBe(true)
    expect(isTextFile('image.png')).toBe(false)
    expect(isTextFile('note.txt', 'text/plain')).toBe(true)
  })

  it('builds embedding text', () => {
    const frontmatter = { name: 'Demo', description: 'Hello' }
    const text = buildEmbeddingText({
      frontmatter,
      readme: 'Readme body',
      otherFiles: [{ path: 'a.txt', content: 'File text' }],
    })
    expect(text).toContain('Demo')
    expect(text).toContain('Readme body')
    expect(text).toContain('a.txt')
  })
})
