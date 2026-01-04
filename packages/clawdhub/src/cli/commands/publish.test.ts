/* @vitest-environment node */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sha256Hex } from '../../skills'
import type { GlobalOpts } from '../types'

vi.mock('../../config.js', () => ({
  readGlobalConfig: vi.fn(async () => ({ registry: 'https://clawdhub.com', token: 'tkn' })),
}))

const mockGetRegistry = vi.fn(async () => 'https://clawdhub.com')
vi.mock('../registry.js', () => ({
  getRegistry: (...args: unknown[]) => mockGetRegistry(...args),
}))

const mockApiRequest = vi.fn()
vi.mock('../../http.js', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}))

const mockFail = vi.fn((message: string) => {
  throw new Error(message)
})
const mockSpinner = { text: '', succeed: vi.fn(), fail: vi.fn() }
vi.mock('../ui.js', () => ({
  createSpinner: vi.fn(() => mockSpinner),
  fail: (...args: unknown[]) => mockFail(...args),
  formatError: (error: unknown) => (error instanceof Error ? error.message : String(error)),
}))

const { cmdPublish } = await import('./publish')

async function makeTmpWorkdir() {
  const root = await mkdtemp(join(tmpdir(), 'clawdhub-publish-'))
  return root
}

function makeOpts(workdir: string): GlobalOpts {
  return {
    workdir,
    dir: join(workdir, 'skills'),
    site: 'https://clawdhub.com',
    registry: 'https://clawdhub.com',
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('cmdPublish', () => {
  it('publishes SKILL.md from disk (mocked HTTP)', async () => {
    const workdir = await makeTmpWorkdir()
    try {
      const folder = join(workdir, 'my-skill')
      await mkdir(folder, { recursive: true })
      const skillContent = '# Skill\n\nHello\n'
      const notesContent = 'notes\n'
      await writeFile(join(folder, 'SKILL.md'), skillContent, 'utf8')
      await writeFile(join(folder, 'notes.md'), notesContent, 'utf8')

      let uploadIndex = 0
      mockApiRequest.mockImplementation(
        async (_registry: string, args: { method: string; path: string }) => {
          if (args.method === 'GET' && args.path.startsWith('/api/skill?slug=')) {
            return { skill: null, latestVersion: { version: '9.9.9' } }
          }
          if (args.method === 'POST' && args.path === '/api/cli/upload-url') {
            uploadIndex += 1
            return { uploadUrl: `https://upload.example/${uploadIndex}` }
          }
          if (args.method === 'POST' && args.path === '/api/cli/publish') {
            return { ok: true, skillId: 'skill_1', versionId: 'ver_1' }
          }
          throw new Error(`Unexpected apiRequest: ${args.method} ${args.path}`)
        },
      )

      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init?: RequestInit) => {
          expect(url).toMatch(/^https:\/\/upload\.example\/\d+$/)
          expect(init?.method).toBe('POST')
          expect((init?.headers as Record<string, string>)?.['Content-Type']).toMatch(
            /text\/(markdown|plain)/,
          )
          return new Response(JSON.stringify({ storageId: `st_${String(url).split('/').pop()}` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }) as unknown as typeof fetch,
      )

      await cmdPublish(makeOpts(workdir), 'my-skill', {
        slug: 'my-skill',
        name: 'My Skill',
        version: '1.0.0',
        changelog: '',
        tags: 'latest',
      })

      const publishCall = mockApiRequest.mock.calls.find((call) => {
        const req = call[1] as { path?: string } | undefined
        return req?.path === '/api/cli/publish'
      })
      if (!publishCall) throw new Error('Missing publish call')
      const publishBody = (publishCall[1] as { body?: unknown }).body as {
        slug: string
        displayName: string
        version: string
        changelog: string
        tags: string[]
        files: Array<{ path: string; sha256: string; storageId: string }>
      }

      expect(publishBody.slug).toBe('my-skill')
      expect(publishBody.displayName).toBe('My Skill')
      expect(publishBody.version).toBe('1.0.0')
      expect(publishBody.changelog).toBe('')
      expect(publishBody.tags).toEqual(['latest'])

      const byPath = Object.fromEntries(publishBody.files.map((f) => [f.path, f]))
      expect(Object.keys(byPath).sort()).toEqual(['SKILL.md', 'notes.md'])
      expect(byPath['SKILL.md']?.sha256).toBe(sha256Hex(new TextEncoder().encode(skillContent)))
      expect(byPath['notes.md']?.sha256).toBe(sha256Hex(new TextEncoder().encode(notesContent)))
    } finally {
      await rm(workdir, { recursive: true, force: true })
    }
  })

  it('requires --changelog when updating an existing skill', async () => {
    const workdir = await makeTmpWorkdir()
    try {
      const folder = join(workdir, 'existing-skill')
      await mkdir(folder, { recursive: true })
      await writeFile(join(folder, 'SKILL.md'), '# Skill\n', 'utf8')

      mockApiRequest.mockImplementation(async () => ({ skill: { slug: 'existing-skill' } }))
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch,
      )

      await expect(
        cmdPublish(makeOpts(workdir), 'existing-skill', { version: '1.0.0', changelog: '' }),
      ).rejects.toThrow(/changelog/i)
    } finally {
      await rm(workdir, { recursive: true, force: true })
    }
  })
})
