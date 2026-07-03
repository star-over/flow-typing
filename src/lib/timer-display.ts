/**
 * @file Display-логика таймера сессии: прошедшее время → показанный обратный отсчёт.
 * Чистая арифметика для Header-хрома, отделённая от руны в `+layout.svelte`, чтобы
 * формула была видима юнит-тесту.
 */

/**
 * Секунды обратного отсчёта для показа в Header, или `null` вне активной сессии
 * (тогда Header счётчик не рисует). Зажим `max(0, …)` не даёт уйти в минус на
 * последнем тике, когда `displayElapsedMs` слегка перешагивает длительность.
 */
export function computeTimerSeconds({
  displayElapsedMs,
  isTraining,
  hasSession,
  durationSeconds,
}: {
  displayElapsedMs: number;
  isTraining: boolean;
  hasSession: boolean;
  durationSeconds: number;
}): number | null {
  if (!isTraining || !hasSession) return null;
  return Math.max(0, durationSeconds - Math.floor(displayElapsedMs / 1000));
}
