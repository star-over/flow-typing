/**
 * @file Канал наблюдаемости (P0-7): приём непойманных клиентских ошибок.
 *
 * Замена внешнему error-tracking'у (Sentry): его дашборд недоступен владельцу в
 * РФ, а US-облако спорит с приватность-брендом проекта. Ошибки складываются в
 * таблицу `clientErrors` — там же, где продуктовые метрики (`sessionSummaries`),
 * и видны в Convex dashboard, к которому доступ уже есть. Зрелый tracking с
 * дедупом/алертами (self-host GlitchTip / PostHog) — драйвер P1 (пошёл добор
 * трафика / ошибок больше, чем ловят прямые интервью беты).
 *
 * `report` — ПУБЛИЧНАЯ, auth опциональна: непойманная ошибка возможна и у гостя
 * (лендинг, /signin, train-gate до входа). Значит писатель неаутентифицирован →
 * два предохранителя storage-abuse: per-user (общий для гостей) rate-limit и
 * обрезка длин полей. Обрезаем МОЛЧА, не бросаем — отчёт об ошибке не должен сам
 * падать. `clampClientError` чистая (без ctx) → юнит-тест напрямую (паттерн
 * `assertValid*` из lib/validation).
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { rateLimiter } from './rateLimiter';

// Потолки длины полей отчёта. Числа-настройки (константами, не в ADR). Взяты со
// щедрым запасом над типичным message/stack — цель отсечь гигантские фабрикации,
// не легитимный стек.
const MAX_MESSAGE = 2_000;
const MAX_STACK = 10_000;
const MAX_URL = 500;
const MAX_USER_AGENT = 500;

function clamp(value: string | undefined, max: number): string | undefined {
  if (value === undefined) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

/** Чистая нормализация входа: обрезка длин (storage-abuse guard). */
export function clampClientError(input: {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
}): { message: string; stack?: string; url?: string; userAgent?: string } {
  return {
    message: clamp(input.message, MAX_MESSAGE) ?? '',
    stack: clamp(input.stack, MAX_STACK),
    url: clamp(input.url, MAX_URL),
    userAgent: clamp(input.userAgent, MAX_USER_AGENT),
  };
}

export const report = mutation({
  args: {
    message: v.string(),
    stack: v.optional(v.string()),
    url: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Auth опциональна: userId проставляется, если есть сессия, иначе гость.
    const userId = await getAuthUserId(ctx);
    // Неаутентифицированный писатель → token-bucket против флуда. throws:false —
    // при исчерпании лимита молча роняем отчёт, а не бросаем клиенту (отправка
    // best-effort at-most-once).
    const { ok } = await rateLimiter.limit(ctx, 'clientErrorReport', {
      key: userId ?? 'anonymous',
    });
    if (!ok) return null;

    const clamped = clampClientError(args);
    await ctx.db.insert('clientErrors', {
      message: clamped.message,
      ...(clamped.stack !== undefined && { stack: clamped.stack }),
      ...(clamped.url !== undefined && { url: clamped.url }),
      ...(clamped.userAgent !== undefined && { userAgent: clamped.userAgent }),
      ...(userId !== null && { userId }),
      capturedAt: Date.now(),
    });
    return null;
  },
});
