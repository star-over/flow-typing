/**
 * @file Бюджет порции (Batch) в символах — **клиентская** бизнес-логика (ADR 0006).
 * cpm и остаток таймера — клиентские сущности; клиент сам переводит их в бюджет
 * символов и просит сервер «добери порцию на ~budgetChars». Сервер про cpm не
 * знает, контракт `getNextBatch` говорит в символах.
 *
 * Размер порции задаётся не числом упражнений, а окном времени печати: сколько
 * знаков пользователь успеет набрать за окно при своей скорости. Количество
 * drill'ов — производная бюджета (CONTEXT.md → Batch).
 */

// Окно порции ≈ 90 секунд печати (план «Числа-настройки», первый этап).
// Провизорное значение, правится по эргономике, не по данным.
export const BATCH_WINDOW_SECONDS = 90;

/**
 * Бюджет порции в символах.
 * @param secondsRemaining остаток таймера сессии
 * @param cpm скорость печати, знаков в минуту
 * @param windowSeconds окно порции; бюджет считается по min(остаток, окно) —
 *   так последняя порция сессии короче, а не «на 90 секунд за край таймера»
 * @returns число знаков, не меньше 1 (порция всегда непустая)
 */
export function computeBudgetChars({
  secondsRemaining,
  cpm,
  windowSeconds = BATCH_WINDOW_SECONDS,
}: {
  secondsRemaining: number;
  cpm: number;
  windowSeconds?: number;
}): number {
  const seconds = Math.min(Math.max(secondsRemaining, 0), windowSeconds);
  const chars = Math.round((seconds * cpm) / 60);
  return Math.max(1, chars);
}
