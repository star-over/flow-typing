import { mutation, query } from './_generated/server';

export const ping = query({
  args: {},
  handler: async () => 'pong' as const,
});

export const tick = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.insert('health', { tickedAt: Date.now() });
  },
});
