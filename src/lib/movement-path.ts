/**
 * @file Чистая модель анимации «визуализации движения» — пространственная ось P0-0.
 * @description Геометрия ломаной пути (дом→цель) и хронометраж ведущего цикла-runway.
 * UI (`MovementPath.svelte`) «глупый»: ведёт rAF и рендер, вся динамика — здесь.
 *
 * Рамка (зафиксирована владельцем, см. `docs/research/rhythm-visualization.md` — смежная
 * ось времени):
 * - **ведущий цикл-runway**: дотяг дом→цель (ведёт) → удержание → быстрый асимметричный
 *   возврат → пауза → повтор. Предвосхищение, не реакция.
 * - **тап у цели** на удержании: точка пульсирует + расходится кольцо («кольцо + пульс»).
 * - для вырожденного пути (цель = дом, длина 1) движения нет — только тап на месте.
 *
 * Хронометраж чист и тестируем (`movement-path.test.ts`); easing — ease-out без bounce/elastic
 * (правило движения DESIGN).
 */

// --- Геометрия ломаной (пиксельные центры клавиш пути) ---
export interface Point {
  x: number;
  y: number;
}

/** Кумулятивные длины: `cumulative[i]` — путь от начала до `points[i]`; `total` — вся длина. */
function arcLengths(points: Point[]): { cumulative: number[]; total: number } {
  const cumulative: number[] = [];
  let acc = 0;
  let prev: Point | undefined;
  for (const p of points) {
    if (prev) acc += Math.hypot(p.x - prev.x, p.y - prev.y);
    cumulative.push(acc);
    prev = p;
  }
  return { cumulative, total: acc };
}

/** Полная длина ломаной (для stroke-dash reveal следа). */
export function totalLength(points: Point[]): number {
  return arcLengths(points).total;
}

/** Точка на ломаной по нормированной доле длины `t` ∈ [0, 1]. */
export function pointAlong({ points, t }: { points: Point[]; t: number }): Point {
  const first = points[0];
  if (!first) return { x: 0, y: 0 };
  if (points.length === 1) return first;
  const { cumulative, total } = arcLengths(points);
  if (total === 0) return first;
  const target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < points.length; i++) {
    const ci = cumulative[i];
    const prevCum = cumulative[i - 1];
    const a = points[i - 1];
    const b = points[i];
    if (ci === undefined || prevCum === undefined || a === undefined || b === undefined) continue;
    if (ci >= target) {
      const segment = ci - prevCum || 1;
      const f = (target - prevCum) / segment;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
  }
  return points[points.length - 1] ?? first;
}

/** `M x y L x y …` — SVG-путь по ломаной. */
export function polylinePath(points: Point[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

// --- Easing (ease-out, без bounce/elastic) ---
export const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);
export const easeInQuad = (t: number): number => t * t;

// --- Хронометраж ведущего цикла-runway ---

/** Длительности фаз (мс) при темпе ×1; делятся на `speed`. */
export const RUNWAY_TIMING = {
  reachMs: 190, // дотяг дом→цель — ведёт
  holdMs: 240, // удержание у цели (в это время идёт тап)
  returnMs: 90, // быстрый асимметричный возврат к дому
  gapMs: 320, // пауза перед следующим циклом
} as const;

export type RunwayPhase = 'reach' | 'hold' | 'return' | 'gap';

/** Кадр цикла: фаза + прогресс внутри неё 0..1. */
export interface RunwayFrame {
  phase: RunwayPhase;
  progress: number;
}

export function phaseDurationMs({ phase, speed }: { phase: RunwayPhase; speed: number }): number {
  const s = Math.max(0.1, speed);
  if (phase === 'reach') return RUNWAY_TIMING.reachMs / s;
  if (phase === 'hold') return RUNWAY_TIMING.holdMs / s;
  if (phase === 'return') return RUNWAY_TIMING.returnMs / s;
  return RUNWAY_TIMING.gapMs / s;
}

/** Полная длительность цикла (мс) при заданном темпе. */
export function cycleDurationMs(speed: number): number {
  const s = Math.max(0.1, speed);
  return (RUNWAY_TIMING.reachMs + RUNWAY_TIMING.holdMs + RUNWAY_TIMING.returnMs + RUNWAY_TIMING.gapMs) / s;
}

/**
 * Фаза цикла-runway в АБСОЛЮТНЫЙ момент времени `timeMs` — чистая функция общих часов.
 * Ключ синхронности: все экземпляры `MovementPath` читают одну и ту же метку времени кадра
 * (`requestAnimationFrame(t)` / `performance.now()`), поэтому вычисляют одну фазу и
 * движутся синхронно (язык анимации: пальцы идут вместе), без per-instance аккумулятора.
 */
export function runwayAtTime({ timeMs, speed }: { timeMs: number; speed: number }): RunwayFrame {
  const cycle = cycleDurationMs(speed);
  let e = ((timeMs % cycle) + cycle) % cycle; // фаза цикла, всегда ∈ [0, cycle)
  const reach = phaseDurationMs({ phase: 'reach', speed });
  const hold = phaseDurationMs({ phase: 'hold', speed });
  const back = phaseDurationMs({ phase: 'return', speed });
  const gap = phaseDurationMs({ phase: 'gap', speed });
  if (e < reach) return { phase: 'reach', progress: e / reach };
  e -= reach;
  if (e < hold) return { phase: 'hold', progress: e / hold };
  e -= hold;
  if (e < back) return { phase: 'return', progress: e / back };
  e -= back;
  return { phase: 'gap', progress: gap > 0 ? e / gap : 0 };
}

/**
 * Доля пройденного пути 0..1 для «дотяга/удержания/возврата»:
 * reach — ease-out нарастание; hold — у цели (1); return — быстрый спад к дому; gap — дома (0).
 */
export function reachFraction(frame: RunwayFrame): number {
  const p = Math.min(1, Math.max(0, frame.progress));
  if (frame.phase === 'reach') return easeOutQuint(p);
  if (frame.phase === 'hold') return 1;
  if (frame.phase === 'return') return 1 - easeInQuad(p);
  return 0;
}

/** Интенсивность тапа 0..1 (только на удержании; иначе 0). Пик — у цели. */
export function tapIntensity(frame: RunwayFrame): number {
  return frame.phase === 'hold' ? easeOutQuint(Math.min(1, Math.max(0, frame.progress))) : 0;
}
