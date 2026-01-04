/* @vitest-environment node */
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  buildSkillFingerprint,
  extractZipToDir,
  hashSkillFiles,
  listTextFiles,
  readLockfile,
  sha256Hex,
  writeLockfile,
} from './skills'

describe('skills', () => {
  it('extracts zip into directory and skips traversal', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'clawdhub-'))
    const zip = zipSync({
      'SKILL.md': strToU8('hello'),
      '../evil.txt': strToU8('nope'),
    })
    await extractZipToDir(new Uint8Array(zip), dir)

    expect((await readFile(join(dir, 'SKILL.md'), 'utf8')).trim()).toBe('hello')
    await expect(stat(join(dir, '..', 'evil.txt'))).rejects.toBeTruthy()
  })

  it('writes and reads lockfile', async () => {
    const workdir = await mkdtemp(join(tmpdir(), 'clawdhub-work-'))
    await writeLockfile(workdir, {
      version: 1,
      skills: { demo: { version: '1.0.0', installedAt: 1 } },
    })
    const read = await readLockfile(workdir)
    expect(read.skills.demo?.version).toBe('1.0.0')
  })

  it('returns empty lockfile on invalid json', async () => {
    const workdir = await mkdtemp(join(tmpdir(), 'clawdhub-work-bad-'))
    await mkdir(join(workdir, '.clawdhub'), { recursive: true })
    await writeFile(join(workdir, '.clawdhub', 'lock.json'), '{', 'utf8')
    const read = await readLockfile(workdir)
    expect(read).toEqual({ version: 1, skills: {} })
  })

  it('skips dotfiles and node_modules when listing text files', async () => {
    const workdir = await mkdtemp(join(tmpdir(), 'clawdhub-files-'))
    await writeFile(join(workdir, 'SKILL.md'), 'hi', 'utf8')
    await writeFile(join(workdir, '.secret.txt'), 'no', 'utf8')
    await mkdir(join(workdir, 'node_modules'), { recursive: true })
    await writeFile(join(workdir, 'node_modules', 'a.txt'), 'no', 'utf8')
    const files = await listTextFiles(workdir)
    expect(files.map((file) => file.relPath)).toEqual(['SKILL.md'])
  })

  it('respects .gitignore and .clawdhubignore', async () => {
    const workdir = await mkdtemp(join(tmpdir(), 'clawdhub-ignore-'))
    await writeFile(join(workdir, '.gitignore'), 'ignored.md\n', 'utf8')
    await writeFile(join(workdir, '.clawdhubignore'), 'private.md\n', 'utf8')
    await writeFile(join(workdir, 'SKILL.md'), 'hi', 'utf8')
    await writeFile(join(workdir, 'ignored.md'), 'no', 'utf8')
    await writeFile(join(workdir, 'private.md'), 'no', 'utf8')
    await writeFile(join(workdir, 'public.json'), '{}', 'utf8')

    const files = await listTextFiles(workdir)
    const paths = files.map((file) => file.relPath).sort()
    expect(paths).toEqual(['SKILL.md', 'public.json'])
    expect(files.find((file) => file.relPath === 'SKILL.md')?.contentType).toMatch(/^text\//)
    expect(files.find((file) => file.relPath === 'public.json')?.contentType).toBe(
      'application/json',
    )
  })

  it('hashes skill files deterministically', async () => {
    const { fingerprint } = hashSkillFiles([
      { relPath: 'b.txt', bytes: strToU8('b') },
      { relPath: 'a.txt', bytes: strToU8('a') },
    ])
    const expected = buildSkillFingerprint([
      { path: 'a.txt', sha256: sha256Hex(strToU8('a')) },
      { path: 'b.txt', sha256: sha256Hex(strToU8('b')) },
    ])
    expect(fingerprint).toBe(expected)
  })
})
