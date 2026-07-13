import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import Yandex from '@auth/core/providers/yandex';
import { Password } from '@convex-dev/auth/providers/Password';
import { describe, expect, test } from 'vitest';
import { buildProviders, createOrUpdateUserHandler } from './auth';
import { makeConvexTest, seedUser } from './test.helpers';

describe('createOrUpdateUserHandler — provider = account', () => {
  test('returns existingUserId when provided (returning user via same provider)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'foo@example.com', name: 'Foo' });
      const result = await createOrUpdateUserHandler({
        ctx,
        existingUserId: userId,
        profile: { email: 'foo@example.com', name: 'Foo Updated' },
      });
      expect(result).toBe(userId);
      const all = await ctx.db.query('users').collect();
      expect(all).toHaveLength(1);
    });
  });

  test('creates new user when existingUserId is null (new OAuth account)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const result = await createOrUpdateUserHandler({
        ctx,
        existingUserId: null,
        profile: { email: 'foo@example.com', name: 'Foo', image: 'https://example.com/foo.png' },
      });
      const created = await ctx.db.get(result);
      expect(created?.email).toBe('foo@example.com');
      expect(created?.name).toBe('Foo');
      expect(created?.image).toBe('https://example.com/foo.png');
    });
  });

  test('does NOT link by email — same email through different provider yields two separate users', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const firstUserId = await createOrUpdateUserHandler({
        ctx,
        existingUserId: null,
        profile: { email: 'shared@example.com', name: 'Via GitHub' },
      });
      const secondUserId = await createOrUpdateUserHandler({
        ctx,
        existingUserId: null,
        profile: { email: 'shared@example.com', name: 'Via Google' },
      });
      expect(secondUserId).not.toBe(firstUserId);
      const all = await ctx.db.query('users').collect();
      expect(all).toHaveLength(2);
    });
  });
});

describe('buildProviders — dev-вход за одиночным fail-closed гейтом (ADR 0012/0023/0024)', () => {
  test('не-production → Password добавлен к трём OAuth-провайдерам', () => {
    expect(buildProviders({ production: false })).toEqual([GitHub, Google, Yandex, Password]);
  });

  test('production → только три OAuth-провайдера, Password отсутствует', () => {
    expect(buildProviders({ production: true })).toEqual([GitHub, Google, Yandex]);
  });
});
