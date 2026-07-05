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

export interface RunwayState {
  phase: RunwayPhase;
  /** Прошло в текущей фазе (мс). */
  phaseElapsedMs: number;
  /** Монотонный таймер (сек) — для непрерывных эффектов, если понадобятся. */
  flowSeconds: number;
}

export function initialRunwayState(): RunwayState {
  return { phase: 'gap', phaseElapsedMs: 0, flowSeconds: 0 };
}

const NEXT_PHASE: Record<RunwayPhase, RunwayPhase> = {
  reach: 'hold',
  hold: 'return',
  return: 'gap',
  gap: 'reach',
};

export function phaseDurationMs({ phase, speed }: { phase: RunwayPhase; speed: number }): number {
  const s = Math.max(0.1, speed);
  if (phase === 'reach') return RUNWAY_TIMING.reachMs / s;
  if (phase === 'hold') return RUNWAY_TIMING.holdMs / s;
  if (phase === 'return') return RUNWAY_TIMING.returnMs / s;
  return RUNWAY_TIMING.gapMs / s;
}

/** Продвигает цикл на `dtMs` (чистая функция). Перекатывает фазы при переполнении. */
export function advanceRunway({
  state,
  dtMs,
  speed,
}: {
  state: RunwayState;
  dtMs: number;
  speed: number;
}): RunwayState {
  let phase = state.phase;
  let elapsed = state.phaseElapsedMs + Math.max(0, dtMs);
  let guard = 0;
  while (elapsed >= phaseDurationMs({ phase, speed }) && guard++ < 8) {
    elapsed -= phaseDurationMs({ phase, speed });
    phase = NEXT_PHASE[phase];
  }
  return { phase, phaseElapsedMs: elapsed, flowSeconds: state.flowSeconds + Math.max(0, dtMs) / 1000 };
}

/** Прогресс текущей фазы 0..1 (сырой). */
export function phaseProgress({ state, speed }: { state: RunwayState; speed: number }): number {
  return Math.min(1, state.phaseElapsedMs / phaseDurationMs({ phase: state.phase, speed }));
}

/**
 * Доля пройденного пути 0..1 для «дотяга/удержания/возврата»:
 * reach — ease-out нарастание; hold — у цели (1); return — быстрый спад к дому; gap — дома (0).
 */
export function reachFraction({ state, speed }: { state: RunwayState; speed: number }): number {
  const p = phaseProgress({ state, speed });
  if (state.phase === 'reach') return easeOutQuint(p);
  if (state.phase === 'hold') return 1;
  if (state.phase === 'return') return 1 - easeInQuad(p);
  return 0;
}

/** Интенсивность тапа 0..1 (только на удержании; иначе 0). Пик — у цели. */
export function tapIntensity({ state, speed }: { state: RunwayState; speed: number }): number {
  return state.phase === 'hold' ? easeOutQuint(phaseProgress({ state, speed })) : 0;
}
