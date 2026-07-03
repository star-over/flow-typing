import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';

// Узкий, тестируемый helper. Принимает уже резолвленный userId — никакой auth ceremony.
// Lib-обёртка (query getMine, см. Step 2.7) делает getAuthUserId и зовёт сюда.
// Паттерн повторяет createOrUpdateUserHandler из convex/auth.ts.
export async function getMineHandler({
  ctx,
  userId,
}: {
  ctx: QueryCtx;
  userId: Id<'users'>;
}) {
  return await ctx.db
    .query('userSettings')
    .withIndex('by_user', q => q.eq('userId', userId))
    .unique();
}

// Insert-or-patch по userId. updatedAt — server-gen (Date.now() здесь).
// Один row на юзера обеспечивается .unique() lookup'ом + insert/patch веткой.
export async function upsertMineHandler({
  ctx,
  userId,
  settings,
}: {
  ctx: MutationCtx;
  userId: Id<'users'>;
  settings: {
    interfaceLanguage: string;
    textLanguage: string;
    symbolLayoutId: string;
    fingerLayoutId: string;
    cursorType: string;
    theme: string;
    displayName: string;
    rhythmChannelEnabled: boolean;
  };
}): Promise<Id<'userSettings'>> {
  const existing = await ctx.db
    .query('userSettings')
    .withIndex('by_user', q => q.eq('userId', userId))
    .unique();

  const now = Date.now();
  if (existing === null) {
    return await ctx.db.insert('userSettings', {
      userId,
      ...settings,
      updatedAt: now,
    });
  }
  await ctx.db.patch(existing._id, {
    ...settings,
    updatedAt: now,
  });
  return existing._id;
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await getMineHandler({ ctx, userId });
  },
});

export const upsertMine = mutation({
  args: {
    interfaceLanguage: v.string(),
    textLanguage: v.string(),
    symbolLayoutId: v.string(),
    fingerLayoutId: v.string(),
    cursorType: v.string(),
    theme: v.string(),
    displayName: v.string(),
    rhythmChannelEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error('Not authenticated');
    }
    return await upsertMineHandler({ ctx, userId, settings: args });
  },
});
