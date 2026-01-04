import { resolve } from 'node:path'
import { intro, isCancel, multiselect, note, outro, text } from '@clack/prompts'
import {
  ApiCliWhoamiResponseSchema,
  ApiRoutes,
  ApiSkillMetaResponseSchema,
  ApiSkillResolveResponseSchema,
} from '@clawdhub/schema'
import semver from 'semver'
import { readGlobalConfig } from '../../config.js'
import { apiRequest } from '../../http.js'
import { hashSkillFiles, listTextFiles } from '../../skills.js'
import { getRegistry } from '../registry.js'
import { findSkillFolders, getFallbackSkillRoots, type SkillFolder } from '../scanSkills.js'
import type { GlobalOpts } from '../types.js'
import { createSpinner, fail, formatError, isInteractive } from '../ui.js'
import { cmdPublish } from './publish.js'

type SyncOptions = {
  root?: string[]
  all?: boolean
  dryRun?: boolean
  bump?: 'patch' | 'minor' | 'major'
  changelog?: string
  tags?: string
}

type Candidate = SkillFolder & {
  fingerprint: string
  fileCount: number
  status: 'synced' | 'new' | 'update'
  matchVersion: string | null
  latestVersion: string | null
}

export async function cmdSync(opts: GlobalOpts, options: SyncOptions, inputAllowed: boolean) {
  const allowPrompt = isInteractive() && inputAllowed !== false

  const cfg = await readGlobalConfig()
  const token = cfg?.token
  if (!token) fail('Not logged in. Run: clawdhub login')

  const registry = await getRegistryWithAuth(opts, token)
  const selectedRoots = buildScanRoots(opts, options.root)

  const spinner = createSpinner('Scanning for local skills')
  let skills = await scanRoots(selectedRoots)
  if (skills.length === 0) {
    const fallback = getFallbackSkillRoots(opts.workdir)
    skills = await scanRoots(fallback)
    spinner.stop()
    if (skills.length === 0)
      fail('No skills found (checked workdir and known Clawdis/Clawd locations)')
    note(`No skills in workdir. Found ${skills.length} in legacy locations.`, fallback.join('\n'))
  } else {
    spinner.stop()
  }

  intro('ClawdHub sync')

  const candidatesSpinner = createSpinner('Checking registry sync state')
  const candidates: Candidate[] = []
  try {
    for (const skill of skills) {
      const filesOnDisk = await listTextFiles(skill.folder)
      const hashed = hashSkillFiles(filesOnDisk)
      const fingerprint = hashed.fingerprint

      const meta = await apiRequest(
        registry,
        { method: 'GET', path: `${ApiRoutes.skill}?slug=${encodeURIComponent(skill.slug)}` },
        ApiSkillMetaResponseSchema,
      ).catch(() => null)

      const latestVersion = meta?.latestVersion?.version ?? null
      if (!latestVersion) {
        candidates.push({
          ...skill,
          fingerprint,
          fileCount: filesOnDisk.length,
          status: 'new',
          matchVersion: null,
          latestVersion: null,
        })
        continue
      }

      const resolved = await apiRequest(
        registry,
        {
          method: 'GET',
          path: `${ApiRoutes.skillResolve}?slug=${encodeURIComponent(skill.slug)}&hash=${encodeURIComponent(fingerprint)}`,
        },
        ApiSkillResolveResponseSchema,
      ).catch((error) => {
        const message = formatError(error)
        if (/skill not found/i.test(message)) return { match: null, latestVersion: null }
        throw error
      })

      const matchVersion = resolved.match?.version ?? null
      candidates.push({
        ...skill,
        fingerprint,
        fileCount: filesOnDisk.length,
        status: matchVersion ? 'synced' : 'update',
        matchVersion,
        latestVersion,
      })
    }
  } catch (error) {
    candidatesSpinner.fail(formatError(error))
    throw error
  } finally {
    candidatesSpinner.stop()
  }

  const synced = candidates.filter((candidate) => candidate.status === 'synced')
  if (synced.length > 0) {
    const lines = synced
      .map((candidate) => `${candidate.slug}  synced (${candidate.matchVersion ?? 'unknown'})`)
      .join('\n')
    note('Already synced', lines)
  }

  const actionable = candidates.filter((candidate) => candidate.status !== 'synced')
  if (actionable.length === 0) {
    outro('Everything is already synced.')
    return
  }

  const selected = await selectToUpload(actionable, {
    allowPrompt,
    all: Boolean(options.all),
    bump: options.bump ?? 'patch',
  })
  if (selected.length === 0) {
    outro('Nothing selected.')
    return
  }

  if (options.dryRun) {
    outro(`Dry run: would upload ${selected.length} skill(s).`)
    return
  }

  const bump = options.bump ?? 'patch'
  const tags = options.tags ?? 'latest'

  for (const skill of selected) {
    const { publishVersion, changelog } = await resolvePublishMeta(skill, {
      bump,
      allowPrompt,
      changelogFlag: options.changelog,
    })
    await cmdPublish(opts, skill.folder, {
      slug: skill.slug,
      name: skill.displayName,
      version: publishVersion,
      changelog,
      tags,
    })
  }

  outro(`Uploaded ${selected.length} skill(s).`)
}

function buildScanRoots(opts: GlobalOpts, extraRoots: string[] | undefined) {
  const roots = [opts.workdir, opts.dir, ...(extraRoots ?? [])]
  return Array.from(new Set(roots.map((root) => resolve(root))))
}

async function scanRoots(roots: string[]) {
  const all: SkillFolder[] = []
  for (const root of roots) {
    const found = await findSkillFolders(root)
    all.push(...found)
  }
  const byFolder = new Map<string, SkillFolder>()
  for (const folder of all) {
    byFolder.set(folder.folder, folder)
  }
  return Array.from(byFolder.values())
}

async function selectToUpload(
  candidates: Candidate[],
  params: { allowPrompt: boolean; all: boolean; bump: 'patch' | 'minor' | 'major' },
): Promise<Candidate[]> {
  if (params.all || !params.allowPrompt) return candidates

  const valueByKey = new Map<string, Candidate>()
  const choices = candidates.map((candidate) => {
    const key = candidate.folder
    valueByKey.set(key, candidate)
    const latest = candidate.latestVersion
    const next = latest ? semver.inc(latest, params.bump) : null
    const status =
      candidate.status === 'new' ? 'NEW' : latest && next ? `UPDATE ${latest} → ${next}` : 'UPDATE'
    return {
      value: key,
      label: `${candidate.slug}  ${status}`,
      hint: candidate.folder,
    }
  })

  const picked = await multiselect({
    message: 'Select skills to upload',
    options: choices,
    initialValues: choices.map((choice) => choice.value),
    required: false,
  })
  if (isCancel(picked)) fail('Canceled')
  const selected = picked.map((key) => valueByKey.get(String(key))).filter(Boolean) as Candidate[]
  return selected
}

async function resolvePublishMeta(
  skill: Candidate,
  params: { bump: 'patch' | 'minor' | 'major'; allowPrompt: boolean; changelogFlag?: string },
) {
  if (skill.status === 'new') {
    return { publishVersion: '1.0.0', changelog: '' }
  }

  const latest = skill.latestVersion
  if (!latest) fail(`Could not resolve latest version for ${skill.slug}`)
  const publishVersion = semver.inc(latest, params.bump)
  if (!publishVersion) fail(`Could not bump version for ${skill.slug}`)

  const fromFlag = params.changelogFlag?.trim()
  if (fromFlag) return { publishVersion, changelog: fromFlag }

  if (!params.allowPrompt) {
    return { publishVersion, changelog: 'Sync update' }
  }

  const entered = await text({
    message: `Changelog for ${skill.slug}@${publishVersion}`,
    placeholder: 'What changed?',
    defaultValue: 'Sync update',
  })
  if (isCancel(entered)) fail('Canceled')
  const changelog = String(entered ?? '').trim()
  if (!changelog) fail('--changelog required for updates')
  return { publishVersion, changelog }
}

async function getRegistryWithAuth(opts: GlobalOpts, token: string) {
  const registry = await getRegistry(opts, { cache: true })
  await apiRequest(
    registry,
    { method: 'GET', path: ApiRoutes.cliWhoami, token },
    ApiCliWhoamiResponseSchema,
  )
  return registry
}
