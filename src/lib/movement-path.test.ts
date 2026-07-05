import { describe, expect, it } from 'vitest';
import {
  advanceRunway,
  easeInQuad,
  easeOutQuint,
  initialRunwayState,
  phaseDurationMs,
  type Point,
  pointAlong,
  polylinePath,
  reachFraction,
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

describe('runway timing', () => {
  it('phaseDurationMs масштабируется темпом', () => {
    expect(phaseDurationMs({ phase: 'reach', speed: 1 })).toBe(RUNWAY_TIMING.reachMs);
    expect(phaseDurationMs({ phase: 'reach', speed: 2 })).toBe(RUNWAY_TIMING.reachMs / 2);
  });

  it('advanceRunway перекатывает фазу при переполнении', () => {
    const start = { phase: 'gap' as const, phaseElapsedMs: 0, flowSeconds: 0 };
    // Ровно длительность gap → переход в reach с нулём остатка.
    const next = advanceRunway({ state: start, dtMs: RUNWAY_TIMING.gapMs, speed: 1 });
    expect(next.phase).toBe('reach');
    expect(next.phaseElapsedMs).toBeCloseTo(0);
  });

  it('advanceRunway перекатывает несколько фаз за большой dt', () => {
    const start = initialRunwayState(); // gap
    const big = RUNWAY_TIMING.gapMs + RUNWAY_TIMING.reachMs + 10;
    const next = advanceRunway({ state: start, dtMs: big, speed: 1 });
    expect(next.phase).toBe('hold');
    expect(next.phaseElapsedMs).toBeCloseTo(10);
  });

  it('flowSeconds монотонно растёт', () => {
    const a = advanceRunway({ state: initialRunwayState(), dtMs: 100, speed: 1 });
    expect(a.flowSeconds).toBeCloseTo(0.1);
  });
});

describe('reachFraction / tapIntensity', () => {
  it('reachFraction: gap=0, hold=1, reach в (0,1), return убывает', () => {
    expect(reachFraction({ state: { phase: 'gap', phaseElapsedMs: 50, flowSeconds: 0 }, speed: 1 })).toBe(0);
    expect(reachFraction({ state: { phase: 'hold', phaseElapsedMs: 50, flowSeconds: 0 }, speed: 1 })).toBe(1);
    const reach = reachFraction({ state: { phase: 'reach', phaseElapsedMs: 95, flowSeconds: 0 }, speed: 1 });
    expect(reach).toBeGreaterThan(0);
    expect(reach).toBeLessThan(1);
    const early = reachFraction({ state: { phase: 'return', phaseElapsedMs: 10, flowSeconds: 0 }, speed: 1 });
    const late = reachFraction({ state: { phase: 'return', phaseElapsedMs: 80, flowSeconds: 0 }, speed: 1 });
    expect(late).toBeLessThan(early); // возврат к дому — убывание доли пути
  });

  it('tapIntensity: 0 вне hold, растёт на hold', () => {
    expect(tapIntensity({ state: { phase: 'reach', phaseElapsedMs: 50, flowSeconds: 0 }, speed: 1 })).toBe(0);
    expect(tapIntensity({ state: { phase: 'gap', phaseElapsedMs: 50, flowSeconds: 0 }, speed: 1 })).toBe(0);
    const mid = tapIntensity({ state: { phase: 'hold', phaseElapsedMs: 120, flowSeconds: 0 }, speed: 1 });
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThanOrEqual(1);
  });
});
