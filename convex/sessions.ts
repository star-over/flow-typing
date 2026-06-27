/**
 * @file Журнал сессий (sessionSummaries): приём сводки ВСЕЙ сессии для аналитики
 * и коучинга. Отдельно от drillRecord (skillProfiles — проекция алгоритма).
 * openedSteps и capturedAt штампует сервер. Гость (не авторизован) → throw
 * 'Not authenticated' (клиент гасит молча, см. session-impl.ts). Handler вынесен
 * для теста без auth-обёртки (паттерн getMineHandler/upsertMineHandler).
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';

// Cold-start: профиля ещё нет → шаг 0 (openedSteps = 1), как resolveOpenedSteps в drill.ts.
const DEFAULT_OPENED_STEPS = 1;

interface SessionSummaryPayload {
  exposures: number;
  clean: number;
  cpm: number;
  durationMs: number;
  latencyMedianMs: number;
  rhythm?: number;
  confusions: { target: string; pressed: string; count: number }[];
}

export async function recordSessionSummaryHandler({
  ctx,
  userId,
  symbolLayoutId,
  payload,
}: {
  ctx: MutationCtx;
  userId: Id<'users'>;
  symbolLayoutId: string;
  payload: SessionSummaryPayload;
}): Promise<Id<'sessionSummaries'>> {
  const profile = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId))
    .unique();

  return await ctx.db.insert('sessionSummaries', {
    userId,
    symbolLayoutId,
    ...payload,
    openedSteps: profile?.openedSteps ?? DEFAULT_OPENED_STEPS,
    capturedAt: Date.now(),
  });
}

export const record = mutation({
  args: {
    symbolLayoutId: v.string(),
    exposures: v.number(),
    clean: v.number(),
    cpm: v.number(),
    durationMs: v.number(),
    latencyMedianMs: v.number(),
    rhythm: v.optional(v.number()),
    confusions: v.array(v.object({ target: v.string(), pressed: v.string(), count: v.number() })),
  },
  handler: async (ctx, { symbolLayoutId, ...payload }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error('Not authenticated');
    return await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId, payload });
  },
});

// ────────────────────────────────────────────────────────────────────────────
// listMine — reader-query журнала для UI (CQRS-симметрия repertoireSnapshot).
// Гость → []. Порядок естественно хронологический: индекс by_user_and_layout с
// фиксированными userId+symbolLayoutId доупорядочен по _creationTime (старые→новые).
// ────────────────────────────────────────────────────────────────────────────
export async function listMineHandler({
  ctx,
  userId,
  symbolLayoutId,
}: {
  ctx: QueryCtx;
  userId: Id<'users'>;
  symbolLayoutId: string;
}) {
  return await ctx.db
    .query('sessionSummaries')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId))
    .collect();
}

export const listMine = query({
  args: { symbolLayoutId: v.string() },
  handler: async (ctx, { symbolLayoutId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await listMineHandler({ ctx, userId, symbolLayoutId });
  },
});
