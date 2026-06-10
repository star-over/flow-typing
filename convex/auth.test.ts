import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { createOrUpdateUserHandler } from './auth';
import schema from './schema';

// import.meta.glob нужен convex-test для регистрации функций; без него `t.action`/`t.mutation`
// падают, плюс импорт `./auth` исполняет `convexAuth(...)` side-effects.
const modules = import.meta.glob('./**/*.ts');

describe('createOrUpdateUserHandler — provider = account', () => {
  test('returns existingUserId when provided (returning user via same provider)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        email: 'foo@example.com',
        name: 'Foo',
      });
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
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
