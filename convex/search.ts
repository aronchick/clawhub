import { type Id, v } from 'convex/values'
import { api } from './_generated/api'
import { action, query } from './_generated/server'
import { generateEmbedding } from './lib/embeddings'

export const searchSkills = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    approvedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const query = args.query.trim()
    if (!query) return []
    const vector = await generateEmbedding(query)
    const results = await ctx.vectorSearch('skillEmbeddings', 'by_embedding', {
      vector,
      limit: args.limit ?? 10,
      filter: (q) =>
        args.approvedOnly
          ? q.eq('visibility', 'latest-approved')
          : q.or(q.eq('visibility', 'latest'), q.eq('visibility', 'latest-approved')),
    })

    const hydrated = await ctx.runQuery(api.search.hydrateResults, {
      embeddingIds: results.map((result) => result._id),
    })

    const scoreById = new Map(results.map((result) => [result._id, result._score]))

    return hydrated
      .map((entry) => ({
        ...entry,
        score: scoreById.get(entry.embeddingId) ?? 0,
      }))
      .filter((entry) => entry.skill)
  },
})

export const hydrateResults = query({
  args: { embeddingIds: v.array(v.id('skillEmbeddings')) },
  handler: async (ctx, args) => {
    const entries = [] as Array<{
      embeddingId: Id<'skillEmbeddings'>
      skill: unknown
      version: unknown
    }>

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
