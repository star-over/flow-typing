// convex/surveys.test.ts
import { describe, expect, test } from 'vitest';
import { recordSurveyHandler, hasRespondedHandler } from './surveys';
import { api } from './_generated/api';
import { makeConvexTest, asUser, seedUser } from './test.helpers';

describe('recordSurveyHandler', () => {
  test('вставляет строку с ответом и server-stamped capturedAt', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'a@example.com' });
      const id = await recordSurveyHandler({ ctx, userId, answer: 'yes' });
      const row = await ctx.db.get(id);
      expect(row?.answer).toBe('yes');
      expect(row?.capturedAt).toBeGreaterThan(0);
    });
  });

  test('dismissed — валидное значение (закрыл не ответив)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'd@example.com' });
      const id = await recordSurveyHandler({ ctx, userId, answer: 'dismissed' });
      expect((await ctx.db.get(id))?.answer).toBe('dismissed');
    });
  });
});

describe('hasRespondedHandler', () => {
  test('false когда строк нет, true после первой', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'h@example.com' });
      expect(await hasRespondedHandler({ ctx, userId })).toBe(false);
      await recordSurveyHandler({ ctx, userId, answer: 'no' });
      expect(await hasRespondedHandler({ ctx, userId })).toBe(true);
    });
  });
});

describe('record mutation — auth', () => {
  test('гость (без identity) → throw Not authenticated', async () => {
    const t = makeConvexTest();
    await expect(t.mutation(api.surveys.record, { answer: 'yes' })).rejects.toThrow(/not authenticated/i);
  });

  test('authenticated: вставляет ответ для identity-юзера', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => seedUser({ ctx, email: 'rec@example.com' }));
    await asUser({ t, userId }).mutation(api.surveys.record, { answer: 'yes' });
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query('surveyResponses')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .first();
      expect(row?.answer).toBe('yes');
    });
  });
});

describe('record mutation — rate limit', () => {
  // surveys.record token bucket capacity=5 (convex/rateLimiter.ts): 5 всплеск ок, 6-й рубится.
  const SURVEY_RECORD_CAPACITY = 5;

  test('всплеск сверх capacity → 6-й вызов throw rate limit', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => seedUser({ ctx, email: 'flood@example.com' }));
    const client = asUser({ t, userId });
    for (let i = 0; i < SURVEY_RECORD_CAPACITY; i++) {
      await client.mutation(api.surveys.record, { answer: 'yes' });
    }
    await expect(client.mutation(api.surveys.record, { answer: 'yes' })).rejects.toThrow(/rate ?limit/i); // ConvexError data: {"kind":"RateLimited",...}
  });
});

describe('hasResponded query — guest', () => {
  test('гость (без identity) → false', async () => {
    const t = makeConvexTest();
    expect(await t.query(api.surveys.hasResponded, {})).toBe(false);
  });
});
