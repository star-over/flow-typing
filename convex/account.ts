import { getAuthUserId } from '@convex-dev/auth/server';
import type { Id } from './_generated/dataModel';
import { mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';

// ────────────────────────────────────────────────────────────────────────────
// deleteMyAccount — право на забвение (GDPR / P0-4). Каскадно стирает ВСЁ,
// что принадлежит юзеру, в ОДНОЙ транзакции: мутация Convex атомарна — при
// ошибке на любом шаге не фиксируется ничего, частичного удаления не бывает.
//
//   Продуктовые данные: userSettings · skillProfiles · sessionSummaries · clientErrors
//   Auth: authRefreshTokens (по сессиям) · authSessions · authAccounts
//   Строка users — последней.
//
// Удаление authSessions делает вход недействительным. Воспроизводим примитив deleteSession
// из @convex-dev/auth (= сессия + все её refresh-токены): встроенного
// deleteAccount библиотека не даёт, а invalidateSessions рассчитан на
// action-контекст, из мутации неудобен.
//
// Self-only: userId приходит из getAuthUserId (обёртка ниже), параметра нет —
// юзер удаляет только себя, чужие строки структурно недостижимы. Не
// dev-инструмент (в отличие от resetMyProfile): работает и на production.
//
// rawCaptures (ADR 0019): канал сырья ещё НЕ развёрнут (таблицы нет в схеме) →
// удалять нечего. Когда появится — сюда добавить удаление строк rawCaptures И
// файлов File Storage (ctx.storage.delete по blob-id), иначе право на забвение
// будет неполным (Consequences ADR 0019: удаление обязано чистить и мету, и блоб).
// ────────────────────────────────────────────────────────────────────────────

/**
 * Каскадное удаление аккаунта. Возвращает `true`, если юзер был удалён, `false`
 * при `userId === null` (нет аутентификации — нечего удалять).
 */
export async function deleteMyAccountHandler({
  ctx,
  userId,
}: {
  ctx: MutationCtx;
  userId: Id<'users'> | null;
}): Promise<boolean> {
  if (userId === null) return false;

  // 1. Продуктовые данные юзера.
  const settings = await ctx.db
    .query('userSettings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const row of settings) await ctx.db.delete(row._id);

  const profiles = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId))
    .collect();
  for (const row of profiles) await ctx.db.delete(row._id);

  const summaries = await ctx.db
    .query('sessionSummaries')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId))
    .collect();
  for (const row of summaries) await ctx.db.delete(row._id);

  // clientErrors (P0-7): телеметрия ошибок с userId юзера. userId optional (гость
  // пишет без него) — eq(userId) отбирает только строки этого юзера, гостевые не трогает.
  const errors = await ctx.db
    .query('clientErrors')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const row of errors) await ctx.db.delete(row._id);

  // 2. Auth: каждая сессия + её refresh-токены (примитив deleteSession), затем аккаунты.
  const sessions = await ctx.db
    .query('authSessions')
    .withIndex('userId', (q) => q.eq('userId', userId))
    .collect();
  for (const session of sessions) {
    const refreshTokens = await ctx.db
      .query('authRefreshTokens')
      .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
      .collect();
    for (const token of refreshTokens) await ctx.db.delete(token._id);
    await ctx.db.delete(session._id);
  }

  const accounts = await ctx.db
    .query('authAccounts')
    .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
    .collect();
  for (const account of accounts) await ctx.db.delete(account._id);

  // 3. Строка юзера — последней.
  await ctx.db.delete(userId);
  return true;
}

/**
 * Продуктовая мутация: авторизованный юзер удаляет собственный аккаунт.
 * Гость (userId === null) → no-op `false`, ничего не трогает.
 */
export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return await deleteMyAccountHandler({ ctx, userId });
  },
});
