import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { action, internalQuery } from './_generated/server'
import { generateEmbedding } from './lib/embeddings'

type HydratedEntry = {
  embeddingId: Id<'skillEmbeddings'>
  skill: Doc<'skills'> | null
  version: Doc<'skillVersions'> | null
}

type SearchResult = HydratedEntry & { score: number }

export const searchSkills: ReturnType<typeof action> = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    highlightedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<SearchResult[]> => {
    const query = args.query.trim()
    if (!query) return []
    const vector = await generateEmbedding(query)
    const results = await ctx.vectorSearch('skillEmbeddings', 'by_embedding', {
      vector,
      limit: args.limit ?? 10,
      filter: (q) => q.or(q.eq('visibility', 'latest'), q.eq('visibility', 'latest-approved')),
    })

    const hydrated = (await ctx.runQuery(internal.search.hydrateResults, {
      embeddingIds: results.map((result) => result._id),
    })) as HydratedEntry[]

    const scoreById = new Map<Id<'skillEmbeddings'>, number>(
      results.map((result) => [result._id, result._score]),
    )

    const filtered = args.highlightedOnly
      ? hydrated.filter((entry) => entry.skill?.batch === 'highlighted')
      : hydrated

    return filtered
      .map((entry) => ({
        ...entry,
        score: scoreById.get(entry.embeddingId) ?? 0,
      }))
      .filter((entry) => entry.skill)
  },
})

export const hydrateResults = internalQuery({
  args: { embeddingIds: v.array(v.id('skillEmbeddings')) },
  handler: async (ctx, args): Promise<HydratedEntry[]> => {
    const entries: HydratedEntry[] = []

    for (const embeddingId of args.embeddingIds) {
      const embedding = await ctx.db.get(embeddingId)
      if (!embedding) continue
      const skill = await ctx.db.get(embedding.skillId)
      const version = await ctx.db.get(embedding.versionId)
      entries.push({ embeddingId, skill, version })
    }

    return entries
  },
})
