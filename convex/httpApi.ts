import { api, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { httpAction } from './_generated/server'
import { requireApiTokenUser } from './lib/apiTokenAuth'
import { publishVersionForUser } from './skills'

type HttpCtx = {
  runAction: (fn: unknown, args: unknown) => Promise<unknown>
  runQuery: (fn: unknown, args: unknown) => Promise<unknown>
  runMutation: (fn: unknown, args: unknown) => Promise<unknown>
}

type SearchSkillEntry = {
  score: number
  skill: {
    slug?: string
    displayName?: string
    summary?: string | null
    updatedAt?: number
  } | null
  version: { version?: string } | null
}

type GetBySlugResult = {
  skill: {
    slug: string
    displayName: string
    summary?: string
    tags: Record<string, string>
    stats: unknown
    createdAt: number
    updatedAt: number
  } | null
  latestVersion: { version: string; createdAt: number; changelog: string } | null
  owner: { handle?: string; displayName?: string; image?: string } | null
} | null

async function searchSkillsHandler(ctx: HttpCtx, request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.trim() ?? ''
  const limit = toOptionalNumber(url.searchParams.get('limit'))
  const approvedOnly = url.searchParams.get('approvedOnly') === 'true'

  if (!query) return json({ results: [] })

  const results = (await ctx.runAction(api.search.searchSkills, {
    query,
    limit,
    approvedOnly: approvedOnly || undefined,
  })) as SearchSkillEntry[]

  return json({
    results: results.map((result) => ({
      score: result.score,
      slug: result.skill?.slug,
      displayName: result.skill?.displayName,
      summary: result.skill?.summary ?? null,
      version: result.version?.version ?? null,
      updatedAt: result.skill?.updatedAt,
    })),
  })
}

export const searchSkillsHttp = httpAction(searchSkillsHandler)

async function getSkillHandler(ctx: HttpCtx, request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')?.trim().toLowerCase()
  if (!slug) return text('Missing slug', 400)

  const result = (await ctx.runQuery(api.skills.getBySlug, { slug })) as GetBySlugResult
  if (!result?.skill) return text('Skill not found', 404)

  return json({
    skill: {
      slug: result.skill.slug,
      displayName: result.skill.displayName,
      summary: result.skill.summary ?? null,
      tags: result.skill.tags,
      stats: result.skill.stats,
      createdAt: result.skill.createdAt,
      updatedAt: result.skill.updatedAt,
    },
    latestVersion: result.latestVersion
      ? {
          version: result.latestVersion.version,
          createdAt: result.latestVersion.createdAt,
          changelog: result.latestVersion.changelog,
        }
      : null,
    owner: result.owner
      ? {
          handle: result.owner.handle ?? null,
          displayName: result.owner.displayName ?? null,
          image: result.owner.image ?? null,
        }
      : null,
  })
}

export const getSkillHttp = httpAction(getSkillHandler)

async function cliWhoamiHandler(ctx: HttpCtx, request: Request) {
  try {
    const { user } = await requireApiTokenUser(ctx, request)
    return json({
      user: {
        handle: user.handle ?? null,
        displayName: user.displayName ?? null,
        image: user.image ?? null,
      },
    })
  } catch {
    return text('Unauthorized', 401)
  }
}

export const cliWhoamiHttp = httpAction(cliWhoamiHandler)

async function cliUploadUrlHandler(ctx: HttpCtx, request: Request) {
  try {
    const { userId } = await requireApiTokenUser(ctx, request)
    const uploadUrl = await ctx.runMutation(internal.uploads.generateUploadUrlForUserInternal, {
      userId,
    })
    return json({ uploadUrl })
  } catch {
    return text('Unauthorized', 401)
  }
}

export const cliUploadUrlHttp = httpAction(cliUploadUrlHandler)

async function cliPublishHandler(ctx: HttpCtx, request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return text('Invalid JSON', 400)
  }

  try {
    const { userId } = await requireApiTokenUser(ctx, request)
    const args = parsePublishBody(body)
    const result = await publishVersionForUser(ctx, userId, args)
    return json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed'
    if (message.toLowerCase().includes('unauthorized')) return text('Unauthorized', 401)
    return text(message, 400)
  }
}

export const cliPublishHttp = httpAction(cliPublishHandler)

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

function text(value: string, status: number) {
  return new Response(value, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function toOptionalNumber(value: string | null) {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parsePublishBody(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('Invalid publish payload')
  const value = body as Record<string, unknown>
  const slug = stringField(value, 'slug')
  const displayName = stringField(value, 'displayName')
  const version = stringField(value, 'version')
  const changelog = stringField(value, 'changelog')
  const tagsRaw = value.tags
  const tags =
    Array.isArray(tagsRaw) && tagsRaw.every((tag) => typeof tag === 'string')
      ? (tagsRaw as string[])
      : undefined
  const filesRaw = value.files
  if (!Array.isArray(filesRaw) || filesRaw.length === 0) throw new Error('files required')

  const files = filesRaw.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid file entry')
    const file = raw as Record<string, unknown>
    const path = stringField(file, 'path')
    const size = numberField(file, 'size')
    const storageId = stringField(file, 'storageId') as Id<'_storage'>
    const sha256 = stringField(file, 'sha256')
    const contentType =
      typeof file.contentType === 'string' ? (file.contentType as string) : undefined
    return { path, size, storageId, sha256, contentType }
  })

  return { slug, displayName, version, changelog, tags, files }
}

function stringField(obj: Record<string, unknown>, key: string) {
  const value = obj[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${key} required`)
  return value
}

function numberField(obj: Record<string, unknown>, key: string) {
  const value = obj[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} must be number`)
  return value
}

export const __test = {
  parsePublishBody,
  toOptionalNumber,
}

export const __handlers = {
  searchSkillsHandler,
  getSkillHandler,
  cliWhoamiHandler,
  cliUploadUrlHandler,
  cliPublishHandler,
}
