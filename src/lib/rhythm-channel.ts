/**
 * @file Чистая модель «канала ритма» — лидирующий ритм-сигнал на экране тренировки.
 *
 * Механика — «дырявый интегратор» (leaky bucket) с самоцентрирующейся зоной:
 * статичная зелёная зона по центру шкалы, маркер-кромка (`level`) мгновенно
 * прыгает вверх на верном нажатии и плавно оседает под «гравитацией». Высота
 * прыжка ВЫЧИСЛЯЕТСЯ так, что стационарная впадина садится точно в центр зоны на
 * ЛЮБОМ темпе → тап в центре держит текущий темп; тап выше центра — разгон, ниже —
 * замедление.
 *
 * Полная инженерная модель, вывод формул и ограничения зафиксированы в
 * `docs/research/rhythm-visualization.md` → раздел 11 (источник истины).
 * Здесь — чистый порт без UI: компонент `RhythmChannel.svelte` держит rAF и состояние,
 * вызывая эти функции.
 *
 * Отличие от прототипа: падение здесь — точная экспонента `level·e^{−g·Δ}`, а не
 * Эйлер `level − g·level·dt`. Точная экспонента делает свойство баланса (центр держит
 * темп) ТОЧНЫМ, а не приближённым, и повторно используется и для постепенного падения, и для
 * дискретного шага при `prefers-reduced-motion`.
 */

/** В какой части зоны была кромка в момент тапа (фиксируется до прыжка). */
export type RhythmZone = 'in' | 'above' | 'below';

// ── Финальные дефолты (раздел 11.8 research-дока) ───────────────────────────
/** Окно EWMA темпа, разброса и сил (с). */
const TAU_SECONDS = 2;
/** Ширина зелёной зоны (доля шкалы). */
export const BAND_WIDTH = 0.35;
/** Показатель зависимости гравитации от темпа: g ∝ (T_ref/μ)^GRAVITY_EXPONENT. */
const GRAVITY_EXPONENT = 0.7;
/** Центр статичной зоны. */
export const ZONE_CENTER = 0.5;
/** Верх шкалы уровня. */
export const MAX_LEVEL = 1.0;
/** Опорный темп (мс) — масштаб зависимости сил от темпа. */
const T_REF_MS = 250;
/** Масштаб гравитации (падения). */
const BASE_GRAVITY = 1.3;
/** Приём удара: интервалы длиннее `max(этого, 3·μ)` — паузы/off-task, отбрасываются. */
const PAUSE_FLOOR_MS = 4000;
/** Зажим среднего интервала (мс): 10…1000 зн/мин. */
export const MIN_INTERVAL_MS = 60;
export const MAX_INTERVAL_MS = 6000;
/** Стартовый средний интервал до набора данных (мс). */
const INITIAL_INTERVAL_MS = 280;

/** Минимальная гравитация — чтобы на очень медленном темпе кромка всё же оседала. */
const MIN_GRAVITY = 0.05;

/** Изменяемое состояние модели (компонент владеет копией). */
export interface RhythmState {
  /** Позиция кромки, `[0, MAX_LEVEL]`. */
  level: number;
  /** Средний интервал между нажатиями (мс), EWMA по времени с окном τ. */
  emaIntervalMs: number;
  /** EWMA-дисперсия интервалов (та же τ) — для метрики ровности. */
  varianceEma: number;
}

/** Покоящееся начальное состояние: кромка в центре, темп — стартовый, разброс нулевой. */
export function initialRhythmState(): RhythmState {
  return { level: ZONE_CENTER, emaIntervalMs: INITIAL_INTERVAL_MS, varianceEma: 0 };
}

/**
 * Силы из текущего темпа. Гравитация мягче, чем 1/√темп (показатель < 1), чтобы на
 * медленном темпе прыжок не упирался в потолок шкалы. Высота прыжка выводится из
 * гравитации так, что впадина садится в центр зоны (см. свойство баланса, 11.5).
 */
export function forcesAt(emaIntervalMs: number): { gravity: number; jumpHeight: number } {
  const e = Math.max(MIN_INTERVAL_MS, emaIntervalMs);
  const intervalSeconds = e / 1000;
  const gravity = Math.max(MIN_GRAVITY, BASE_GRAVITY * Math.pow(T_REF_MS / e, GRAVITY_EXPONENT));
  // H = Zc·(e^{g·T} − 1) ⇒ стационар (L+H)·e^{−g·T} = L даёт L = Zc на любом темпе.
  const jumpHeight = Math.max(0, ZONE_CENTER * (Math.exp(gravity * intervalSeconds) - 1));
  return { gravity, jumpHeight };
}

/**
 * Принять ли удар в темп. Длинные интервалы — это паузы/отвлечение, а не моторный
 * сигнал; пол `PAUSE_FLOOR_MS` нужен, чтобы резкий переход на медленный темп
 * принимался сразу, а не зависал.
 */
export function isBeatAccepted({
  intervalMs,
  emaIntervalMs,
}: {
  intervalMs: number;
  emaIntervalMs: number;
}): boolean {
  return intervalMs > 0 && intervalMs <= Math.max(PAUSE_FLOOR_MS, 3 * emaIntervalMs);
}

/**
 * Обновление темпа и разброса на принятый удар (EWMA «по времени»: вес зависит от
 * прошедшего времени, а не от числа образцов, — темп симметрично растёт и падает и не
 * залипает на редких медленных ударах).
 */
export function updateTempo({
  emaIntervalMs,
  varianceEma,
  intervalMs,
}: {
  emaIntervalMs: number;
  varianceEma: number;
  intervalMs: number;
}): { emaIntervalMs: number; varianceEma: number } {
  const alpha = 1 - Math.exp(-intervalMs / (TAU_SECONDS * 1000));
  const deviation = intervalMs - emaIntervalMs;
  const nextEma = emaIntervalMs + alpha * deviation;
  return {
    emaIntervalMs: Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, nextEma)),
    varianceEma: (1 - alpha) * (varianceEma + alpha * deviation * deviation),
  };
}

/**
 * Плавное (или дискретное) падение кромки за `seconds`. Точная экспонента:
 * поэтапно `seconds = dt`; одним дискретным шагом за интервал (reduced-motion)
 * `seconds = Δ`. Результат идентичен при равной суммарной длительности.
 */
export function applyFall({
  level,
  gravity,
  seconds,
}: {
  level: number;
  gravity: number;
  seconds: number;
}): number {
  const next = level * Math.exp(-gravity * seconds);
  return next < 0.0001 ? 0 : next;
}

/** Мгновенный прыжок кромки вверх, с зажимом в потолок шкалы. */
export function applyJump({ level, jumpHeight }: { level: number; jumpHeight: number }): number {
  return Math.min(MAX_LEVEL, level + jumpHeight);
}

/** Зона кромки относительно статичной зелёной полосы (в зоне / выше / ниже). */
export function zoneOf({ level }: { level: number }): RhythmZone {
  if (level > ZONE_CENTER + BAND_WIDTH / 2) return 'above';
  if (level < ZONE_CENTER - BAND_WIDTH / 2) return 'below';
  return 'in';
}
