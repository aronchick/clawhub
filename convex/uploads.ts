import { mutation } from './_generated/server'
import { requireUser } from './lib/access'

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx)
    return ctx.storage.generateUploadUrl()
  },
})
