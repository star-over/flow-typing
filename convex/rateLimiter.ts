/**
 * @file Инстанс RateLimiter (P0-10, anti-abuse). Один на проект, общий для трёх
 * писательских мутаций. OAuth-аккаунты массовы/бесплатны → авторизованный юзер
 * иначе может неограниченно долбить запись (флуд `sessionSummaries` /
 * `skillProfiles` / `userSettings`). Per-user token-bucket рубит автоматический
 * флуд, но щедро — никогда не бьёт легитимного юзера (сессия ≥ 60 c, чекпоинты
 * редки, смены настроек штучны). Универсальный харденинг на всех деплоях, не
 * dev-гейт (ADR 0023 / `isProduction()` тут ни при чём).
 *
 * Числа-лимиты — настройки (константы в коде, не в ADR). Token bucket: `rate` —
 * пополнение за `period`, `capacity` — размер всплеска (стартовый запас токенов).
 * Ключ лимита — `userId` (задаётся на call-site через `{ key }`).
 */
import { RateLimiter, MINUTE } from '@convex-dev/rate-limiter';
import { components } from './_generated/api';

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // sessions.record — 1 легитимный вызов за ≥ 60 c (сессия длится минимум минуту).
  sessionRecord: { kind: 'token bucket', rate: 20, period: MINUTE, capacity: 10 },
  // drillRecord — несколько чекпоинтов за сессию (перед доборами очереди + финал).
  drillRecord: { kind: 'token bucket', rate: 40, period: MINUTE, capacity: 20 },
  // upsertMine — штучные смены настроек + один pull/push на login-синхронизацию.
  settingsUpsert: { kind: 'token bucket', rate: 30, period: MINUTE, capacity: 15 },
  // clientErrors.report — ПУБЛИЧНЫЙ неаутентифицированный писатель (отчёт об
  // ошибке, в т.ч. от гостя). Щедро на легитимные краши, но рубит автоматический
  // флуд storage-abuse. Ключ — userId; гости делят общий 'anonymous' (худший
  // случай — флудящий гость глушит логи других гостей, но БД защищена).
  clientErrorReport: { kind: 'token bucket', rate: 30, period: MINUTE, capacity: 20 },
  // surveys.record — редчайший писатель (один раз на юзера). Лимит только против
  // автоматического флуда; легитимный юзер бьёт максимум раз за всё время.
  surveyRecord: { kind: 'token bucket', rate: 10, period: MINUTE, capacity: 5 },
});
