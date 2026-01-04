/* @vitest-environment node */

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GlobalOpts } from '../types'

const mockIntro = vi.fn()
const mockOutro = vi.fn()
const mockNote = vi.fn()

vi.mock('@clack/prompts', () => ({
  intro: (value: string) => mockIntro(value),
  outro: (value: string) => mockOutro(value),
  note: (message: string, body?: string) => mockNote(message, body),
  multiselect: vi.fn(async () => []),
  text: vi.fn(async () => ''),
  isCancel: () => false,
}))

vi.mock('../../config.js', () => ({
  readGlobalConfig: vi.fn(async () => ({ registry: 'https://clawdhub.com', token: 'tkn' })),
}))

const mockGetRegistry = vi.fn(async () => 'https://clawdhub.com')
vi.mock('../registry.js', () => ({
  getRegistry: () => mockGetRegistry(),
}))

const mockApiRequest = vi.fn()
vi.mock('../../http.js', () => ({
  apiRequest: (registry: unknown, args: unknown, schema?: unknown) =>
    mockApiRequest(registry, args, schema),
}))

const mockFail = vi.fn((message: string) => {
  throw new Error(message)
})
const mockSpinner = { succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() }
vi.mock('../ui.js', () => ({
  createSpinner: vi.fn(() => mockSpinner),
  fail: (message: string) => mockFail(message),
  formatError: (error: unknown) => (error instanceof Error ? error.message : String(error)),
  isInteractive: () => false,
}))

vi.mock('../scanSkills.js', () => ({
  findSkillFolders: vi.fn(async (root: string) => {
    if (!root.endsWith('/scan')) return []
    return [
      { folder: '/scan/new-skill', slug: 'new-skill', displayName: 'New Skill' },
      { folder: '/scan/synced-skill', slug: 'synced-skill', displayName: 'Synced Skill' },
      { folder: '/scan/update-skill', slug: 'update-skill', displayName: 'Update Skill' },
    ]
  }),
  getFallbackSkillRoots: vi.fn(() => []),
}))

vi.mock('../../skills.js', async () => {
  const actual = await vi.importActual<typeof import('../../skills.js')>('../../skills.js')
  return {
    ...actual,
    listTextFiles: vi.fn(async (folder: string) => [
      { relPath: 'SKILL.md', bytes: new TextEncoder().encode(folder) },
    ]),
  }
})

const mockCmdPublish = vi.fn()
vi.mock('./publish.js', () => ({
  cmdPublish: (...args: unknown[]) => mockCmdPublish(...args),
}))

const { cmdSync } = await import('./sync')

function makeOpts(): GlobalOpts {
  return {
    workdir: '/work',
    dir: '/work/skills',
    site: 'https://clawdhub.com',
    registry: 'https://clawdhub.com',
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('cmdSync', () => {
  it('classifies skills as new/update/synced (dry-run, mocked HTTP)', async () => {
    mockApiRequest.mockImplementation(async (_registry: string, args: { path: string }) => {
      if (args.path === '/api/cli/whoami') return { user: { handle: 'steipete' } }
      if (args.path.startsWith('/api/skill?slug=')) {
        const slug = new URL(`https://x.test${args.path}`).searchParams.get('slug')
        if (slug === 'new-skill') return { latestVersion: undefined, skill: null }
        if (slug === 'synced-skill') return { latestVersion: { version: '1.2.3' }, skill: {} }
        if (slug === 'update-skill') return { latestVersion: { version: '1.0.0' }, skill: {} }
      }
      if (args.path.startsWith('/api/skill/resolve?')) {
        const u = new URL(`https://x.test${args.path}`)
        const slug = u.searchParams.get('slug')
        if (slug === 'synced-skill') {
          return { match: { version: '1.2.3' }, latestVersion: { version: '1.2.3' } }
        }
        if (slug === 'update-skill') {
          return { match: null, latestVersion: { version: '1.0.0' } }
        }
      }
      throw new Error(`Unexpected apiRequest: ${args.path}`)
    })

    await cmdSync(makeOpts(), { root: ['/scan'], all: true, dryRun: true }, true)

    expect(mockCmdPublish).not.toHaveBeenCalled()

    const alreadySyncedNote = mockNote.mock.calls.find((call) => call[0] === 'Already synced')
    expect(alreadySyncedNote?.[1]).toMatch(/synced-skill/)

    const dryRunOutro = mockOutro.mock.calls.at(-1)?.[0]
    expect(String(dryRunOutro)).toMatch(/Dry run: would upload 2 skill/)
  })
})

