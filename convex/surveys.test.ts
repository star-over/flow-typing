// convex/surveys.test.ts
import { describe, expect, test } from 'vitest';
import { recordSurveyHandler, hasRespondedHandler } from './surveys';
import { makeConvexTest, seedUser } from './test.helpers';

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
