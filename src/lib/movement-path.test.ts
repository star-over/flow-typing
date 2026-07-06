import { describe, expect, it } from 'vitest';
import {
  cycleDurationMs,
  easeInQuad,
  easeOutQuint,
  phaseDurationMs,
  type Point,
  pointAlong,
  polylinePath,
  reachFraction,
  runwayAtTime,
  RUNWAY_TIMING,
  tapIntensity,
  totalLength,
} from './movement-path';

const line: Point[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
]; // длина 20 (L-образная)

describe('geometry', () => {
  it('totalLength суммирует сегменты', () => {
    expect(totalLength(line)).toBe(20);
    expect(totalLength([{ x: 0, y: 0 }])).toBe(0);
    expect(totalLength([])).toBe(0);
  });

  it('pointAlong: концы и середина', () => {
    expect(pointAlong({ points: line, t: 0 })).toEqual({ x: 0, y: 0 });
    expect(pointAlong({ points: line, t: 1 })).toEqual({ x: 10, y: 10 });
    // t=0.5 → 10 единиц пути → конец первого сегмента (угол)
    expect(pointAlong({ points: line, t: 0.5 })).toEqual({ x: 10, y: 0 });
    // t=0.75 → середина второго сегмента
    expect(pointAlong({ points: line, t: 0.75 })).toEqual({ x: 10, y: 5 });
  });

  it('pointAlong: вырожденные входы', () => {
    expect(pointAlong({ points: [], t: 0.5 })).toEqual({ x: 0, y: 0 });
    expect(pointAlong({ points: [{ x: 3, y: 4 }], t: 0.5 })).toEqual({ x: 3, y: 4 });
    // t зажимается в [0,1]
    expect(pointAlong({ points: line, t: -1 })).toEqual({ x: 0, y: 0 });
    expect(pointAlong({ points: line, t: 2 })).toEqual({ x: 10, y: 10 });
  });

  it('polylinePath формирует M/L', () => {
    expect(polylinePath([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('M 1.00 2.00 L 3.00 4.00');
    expect(polylinePath([])).toBe('');
  });
});

describe('easing', () => {
  it('границы и монотонность', () => {
    expect(easeOutQuint(0)).toBe(0);
    expect(easeOutQuint(1)).toBe(1);
    expect(easeOutQuint(0.5)).toBeGreaterThan(0.5); // ease-out обгоняет линейный
    expect(easeInQuad(0)).toBe(0);
    expect(easeInQuad(1)).toBe(1);
    expect(easeInQuad(0.5)).toBe(0.25);
  });
});

describe('runway timing (time-based, синхронно через общие часы)', () => {
  it('phaseDurationMs / cycleDurationMs зависят от темпа', () => {
    const sum = RUNWAY_TIMING.reachMs + RUNWAY_TIMING.holdMs + RUNWAY_TIMING.returnMs + RUNWAY_TIMING.gapMs;
    expect(phaseDurationMs({ phase: 'reach', speed: 1 })).toBe(RUNWAY_TIMING.reachMs);
    expect(phaseDurationMs({ phase: 'reach', speed: 2 })).toBe(RUNWAY_TIMING.reachMs / 2);
    expect(cycleDurationMs(1)).toBe(sum);
    expect(cycleDurationMs(2)).toBe(sum / 2);
  });

  it('runwayAtTime: границы фаз', () => {
    const { reachMs, holdMs, returnMs } = RUNWAY_TIMING;
    expect(runwayAtTime({ timeMs: 0, speed: 1 })).toEqual({ phase: 'reach', progress: 0 });
    expect(runwayAtTime({ timeMs: reachMs, speed: 1 }).phase).toBe('hold');
    expect(runwayAtTime({ timeMs: reachMs + holdMs, speed: 1 }).phase).toBe('return');
    expect(runwayAtTime({ timeMs: reachMs + holdMs + returnMs, speed: 1 }).phase).toBe('gap');
  });

  it('одинаковое время → одинаковый кадр (гарантия синхронности экземпляров)', () => {
    expect(runwayAtTime({ timeMs: 517, speed: 1 })).toEqual(runwayAtTime({ timeMs: 517, speed: 1 }));
  });

  it('runwayAtTime зациклен (период = cycle)', () => {
    const cycle = cycleDurationMs(1);
    expect(runwayAtTime({ timeMs: 123 + cycle, speed: 1 })).toEqual(runwayAtTime({ timeMs: 123, speed: 1 }));
  });

  it('runwayAtTime: отрицательное время нормируется в [0,cycle)', () => {
    const cycle = cycleDurationMs(1);
    expect(runwayAtTime({ timeMs: -10, speed: 1 })).toEqual(runwayAtTime({ timeMs: cycle - 10, speed: 1 }));
  });
});

describe('reachFraction / tapIntensity', () => {
  it('reachFraction: gap=0, hold=1, reach в (0,1), return убывает', () => {
    expect(reachFraction({ phase: 'gap', progress: 0.5 })).toBe(0);
    expect(reachFraction({ phase: 'hold', progress: 0.5 })).toBe(1);
    const reach = reachFraction({ phase: 'reach', progress: 0.5 });
    expect(reach).toBeGreaterThan(0);
    expect(reach).toBeLessThan(1);
    const early = reachFraction({ phase: 'return', progress: 0.1 });
    const late = reachFraction({ phase: 'return', progress: 0.8 });
    expect(late).toBeLessThan(early); // возврат к дому — убывание доли пути
  });

  it('tapIntensity: 0 вне hold, растёт на hold', () => {
    expect(tapIntensity({ phase: 'reach', progress: 0.5 })).toBe(0);
    expect(tapIntensity({ phase: 'gap', progress: 0.5 })).toBe(0);
    const mid = tapIntensity({ phase: 'hold', progress: 0.5 });
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThanOrEqual(1);
  });
});
