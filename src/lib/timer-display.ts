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

/**
 * Длительность в `м:сс` для карточки результатов. Сырыми секундами показывать
 * нельзя: `sessionDurationSeconds` доходит до 900 (CONTEXT.md), а «900 с» никто
 * не читает как пятнадцать минут. Секунды всегда в двух знаках — иначе «1:5»
 * вместо «1:05». Отрицательное зажимаем в ноль (защита от дребезга на последнем
 * тике, как в `computeTimerSeconds`).
 */
export function formatDurationShort(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
