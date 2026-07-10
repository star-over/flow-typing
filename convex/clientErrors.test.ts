import { describe, expect, test } from 'vitest';
import { clampClientError, report } from './clientErrors';
import { api } from './_generated/api';
import { makeConvexTest, asUser, seedUser } from './test.helpers';

// report импортируется, чтобы завязать тест на реальный модуль (tree-shake guard).
void report;

describe('clampClientError', () => {
  test('короткие поля не трогаются', () => {
    const input = { message: 'boom', stack: 'at foo', url: '/train', userAgent: 'UA' };
    expect(clampClientError(input)).toEqual(input);
  });

  test('обрезает длинные поля по потолкам', () => {
    const result = clampClientError({
      message: 'm'.repeat(5_000),
      stack: 's'.repeat(20_000),
      url: 'u'.repeat(1_000),
      userAgent: 'a'.repeat(1_000),
    });
    expect(result.message.length).toBe(2_000);
    expect(result.stack?.length).toBe(10_000);
    expect(result.url?.length).toBe(500);
    expect(result.userAgent?.length).toBe(500);
  });

  test('отсутствующие optional-поля остаются undefined', () => {
    const result = clampClientError({ message: 'boom' });
    expect(result.message).toBe('boom');
    expect(result.stack).toBeUndefined();
    expect(result.url).toBeUndefined();
    expect(result.userAgent).toBeUndefined();
  });
});

describe('report mutation', () => {
  test('гость: пишет строку без userId', async () => {
    const t = makeConvexTest();
    await t.mutation(api.clientErrors.report, { message: 'guest boom', url: '/signin' });
    await t.run(async (ctx) => {
      const rows = await ctx.db.query('clientErrors').collect();
      expect(rows).toHaveLength(1);
      expect(rows[0].message).toBe('guest boom');
      expect(rows[0].url).toBe('/signin');
      expect(rows[0].userId).toBeUndefined();
      expect(rows[0].capturedAt).toBeGreaterThan(0);
    });
  });

  test('авторизованный: пишет строку с userId', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => seedUser({ ctx, email: 'a@example.com' }));
    await asUser({ t, userId }).mutation(api.clientErrors.report, { message: 'auth boom' });
    await t.run(async (ctx) => {
      const rows = await ctx.db.query('clientErrors').collect();
      expect(rows).toHaveLength(1);
      expect(rows[0].userId).toBe(userId);
    });
  });

  test('длинный message обрезается до записи', async () => {
    const t = makeConvexTest();
    await t.mutation(api.clientErrors.report, { message: 'm'.repeat(5_000) });
    await t.run(async (ctx) => {
      const rows = await ctx.db.query('clientErrors').collect();
      expect(rows[0].message.length).toBe(2_000);
    });
  });
});
