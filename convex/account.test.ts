import { describe, expect, test } from 'vitest';
import { deleteMyAccountHandler } from './account';
import { makeConvexTest, seedUser, seedProfile } from './test.helpers';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

// Сеет юзера со строками во ВСЕХ таблицах, которые трогает каскад: продуктовые
// (userSettings, skillProfiles, sessionSummaries, clientErrors) + auth (authAccounts,
// authSessions, authRefreshTokens). Возвращает userId + sessionId (refresh-токен
// висит на сессии, не на userId — нужен для проверки его удаления).
async function seedFullUser({
  ctx,
  email,
}: {
  ctx: MutationCtx;
  email: string;
}): Promise<{ userId: Id<'users'>; sessionId: Id<'authSessions'> }> {
  const userId = await seedUser({ ctx, email });
  await ctx.db.insert('userSettings', {
    userId,
    interfaceLanguage: 'en',
    textLanguage: 'en',
    symbolLayoutId: 'qwerty',
    theme: 'auto',
    updatedAt: 1,
  });
  await seedProfile({ ctx, userId, symbolLayoutId: 'qwerty', openedSteps: 3 });
  await ctx.db.insert('sessionSummaries', {
    userId,
    symbolLayoutId: 'qwerty',
    capturedAt: 1,
    openedSteps: 3,
    durationMs: 1000,
    exposures: 10,
    clean: 8,
    cpm: 40,
    latencyMedianMs: 200,
    confusions: [],
  });
  await ctx.db.insert('clientErrors', { userId, message: 'boom', capturedAt: 1 });
  await ctx.db.insert('authAccounts', {
    userId,
    provider: 'github',
    providerAccountId: `gh-${email}`,
  });
  const sessionId = await ctx.db.insert('authSessions', { userId, expirationTime: 999 });
  await ctx.db.insert('authRefreshTokens', { sessionId, expirationTime: 999 });
  return { userId, sessionId };
}

// Считает строки, принадлежащие юзеру, по всем таблицам каскада. Всё нулевое =
// от юзера не осталось ничего.
async function userFootprint({
  ctx,
  userId,
  sessionId,
}: {
  ctx: MutationCtx;
  userId: Id<'users'>;
  sessionId: Id<'authSessions'>;
}) {
  const settings = await ctx.db
    .query('userSettings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  const profiles = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId))
    .collect();
  const summaries = await ctx.db
    .query('sessionSummaries')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId))
    .collect();
  const errors = await ctx.db
    .query('clientErrors')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  const accounts = await ctx.db
    .query('authAccounts')
    .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
    .collect();
  const sessions = await ctx.db
    .query('authSessions')
    .withIndex('userId', (q) => q.eq('userId', userId))
    .collect();
  const refreshTokens = await ctx.db
    .query('authRefreshTokens')
    .withIndex('sessionId', (q) => q.eq('sessionId', sessionId))
    .collect();
  const user = await ctx.db.get(userId);
  return {
    settings: settings.length,
    profiles: profiles.length,
    summaries: summaries.length,
    errors: errors.length,
    accounts: accounts.length,
    sessions: sessions.length,
    refreshTokens: refreshTokens.length,
    user: user === null ? 0 : 1,
  };
}

const FULL = { settings: 1, profiles: 1, summaries: 1, errors: 1, accounts: 1, sessions: 1, refreshTokens: 1, user: 1 };
const EMPTY = { settings: 0, profiles: 0, summaries: 0, errors: 0, accounts: 0, sessions: 0, refreshTokens: 0, user: 0 };

describe('deleteMyAccountHandler', () => {
  test('стирает все строки юзера во всех таблицах каскада', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const a = await seedFullUser({ ctx, email: 'a@example.com' });
      expect(await userFootprint({ ctx, ...a })).toEqual(FULL); // предпосылка: всё засеяно

      const deleted = await deleteMyAccountHandler({ ctx, userId: a.userId });

      expect(deleted).toBe(true);
      expect(await userFootprint({ ctx, ...a })).toEqual(EMPTY);
    });
  });

  test('не трогает данные другого юзера', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const a = await seedFullUser({ ctx, email: 'a@example.com' });
      const b = await seedFullUser({ ctx, email: 'b@example.com' });

      await deleteMyAccountHandler({ ctx, userId: a.userId });

      expect(await userFootprint({ ctx, ...a })).toEqual(EMPTY);
      expect(await userFootprint({ ctx, ...b })).toEqual(FULL); // чужое цело
    });
  });

  test('не трогает clientErrors гостя (userId === undefined)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const a = await seedFullUser({ ctx, email: 'a@example.com' });
      // Ошибка без userId — гостевая телеметрия (лендинг/signin до входа). Каскад
      // юзера её не должен коснуться: удаление scoped по userId, не «стереть всё».
      const guestErrorId = await ctx.db.insert('clientErrors', { message: 'guest boom', capturedAt: 1 });

      await deleteMyAccountHandler({ ctx, userId: a.userId });

      expect(await userFootprint({ ctx, ...a })).toEqual(EMPTY); // ошибка юзера ушла
      expect(await ctx.db.get(guestErrorId)).not.toBeNull(); // гостевая цела
    });
  });

  test('no-op при userId === null (ничего не удалено)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const a = await seedFullUser({ ctx, email: 'a@example.com' });

      const deleted = await deleteMyAccountHandler({ ctx, userId: null });

      expect(deleted).toBe(false);
      expect(await userFootprint({ ctx, ...a })).toEqual(FULL);
    });
  });
});
