/* @vitest-environment node */
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { extractZipToDir, listTextFiles, readLockfile, writeLockfile } from './skills'

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
})
