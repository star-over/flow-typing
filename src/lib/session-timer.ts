/**
 * @file Чистая арифметика таймера сессии: живое прошедшее, коммит сегмента с
 * зажимом в окно, предикат истечения. Единственный дом формулы
 * `elapsedMs + (now − segmentStartedAt)` (ADR 0007 — один источник чисел времени;
 * прежде написана трижды в assign/guard sessionMachine). Date.now() остаётся в
 * машине — сюда `now` приходит параметром, поэтому функции чисты и тестируемы.
 */

/**
 * Живое прошедшее: зафиксированный аккумулятор завершённых сегментов плюс текущий
 * незакрытый сегмент. НЕ зажимается окном — зажим только на коммите.
 */
export function liveElapsed({
  elapsedMs,
  segmentStartedAt,
  now,
}: {
  elapsedMs: number;
  segmentStartedAt: number;
  now: number;
}): number {
  return elapsedMs + (now - segmentStartedAt);
}

/**
 * Коммит сегмента на выходе из timing (→ paused или → done), зажатый в окно.
 * Активное время по построению не превышает бюджет, поэтому на done всегда ровно
 * ≤ windowMs (никаких «61 с»). На паузе зажим — no-op (живое < окна).
 */
export function commitSegment({
  elapsedMs,
  segmentStartedAt,
  now,
  windowMs,
}: {
  elapsedMs: number;
  segmentStartedAt: number;
  now: number;
  windowMs: number;
}): number {
  return Math.min(liveElapsed({ elapsedMs, segmentStartedAt, now }), windowMs);
}

/**
 * Истечение ловится ровно на окне (граница включительно): живой расчёт, а не
 * значение прошлого тика, поэтому истечение срабатывает в любой активный момент,
 * включая незакрытый сегмент refilling.
 */
export function isExpired({
  elapsedMs,
  segmentStartedAt,
  now,
  windowMs,
}: {
  elapsedMs: number;
  segmentStartedAt: number;
  now: number;
  windowMs: number;
}): boolean {
  return liveElapsed({ elapsedMs, segmentStartedAt, now }) >= windowMs;
}
