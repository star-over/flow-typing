/**
 * @file micro-survey (P1): приём одного ответа «Помогает печатать не глядя?»
 * (Да/Немного/Нет) или закрытия ('dismissed'). «Показан?» выводится из наличия
 * строки (hasResponded), отдельного флага нет. Неавторизованный вызов → throw
 * (record) / false (hasResponded). Handler вынесен для теста без auth-обёртки
 * (паттерн recordSessionSummaryHandler).
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { rateLimiter } from './rateLimiter';

export type SurveyAnswer = 'yes' | 'somewhat' | 'no' | 'dismissed';

export async function recordSurveyHandler({
  ctx,
  userId,
  answer,
}: {
  ctx: MutationCtx;
  userId: Id<'users'>;
  answer: SurveyAnswer;
}): Promise<Id<'surveyResponses'>> {
  return await ctx.db.insert('surveyResponses', { userId, answer, capturedAt: Date.now() });
}

export const record = mutation({
  args: {
    answer: v.union(
      v.literal('yes'), v.literal('somewhat'), v.literal('no'), v.literal('dismissed'),
    ),
  },
  handler: async (ctx, { answer }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error('Not authenticated');
    await rateLimiter.limit(ctx, 'surveyRecord', { key: userId, throws: true });
    return await recordSurveyHandler({ ctx, userId, answer });
  },
});

export async function hasRespondedHandler({
  ctx,
  userId,
}: {
  ctx: QueryCtx;
  userId: Id<'users'>;
}): Promise<boolean> {
  const row = await ctx.db
    .query('surveyResponses')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first();
  return row !== null;
}

export const hasResponded = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;
    return await hasRespondedHandler({ ctx, userId });
  },
});
