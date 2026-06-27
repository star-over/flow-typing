import { describe, expect, test } from 'vitest';
import {
  applyFall,
  applyJump,
  forcesAt,
  isBeatAccepted,
  MAX_INTERVAL_MS,
  MAX_LEVEL,
  MIN_INTERVAL_MS,
  updateTempo,
  ZONE_CENTER,
  BAND_WIDTH,
  zoneOf,
} from './rhythm-channel';

describe('forcesAt', () => {
  test('гравитация растёт с темпом (короче интервал → выше гравитация)', () => {
    expect(forcesAt(150).gravity).toBeGreaterThan(forcesAt(400).gravity);
  });

  test('высота прыжка положительна и растёт на медленном темпе', () => {
    expect(forcesAt(250).jumpHeight).toBeGreaterThan(0);
    expect(forcesAt(600).jumpHeight).toBeGreaterThan(forcesAt(250).jumpHeight);
  });
});

describe('свойство баланса: центр держит темп на любом темпе', () => {
  // Стационар: (Zc + H)·e^{−g·T} = Zc. Высота H выводится так, чтобы это выполнялось
  // точно — значит тап ровно в центре зоны удерживает текущий темп (11.5).
  test.each([180, 250, 400, 800, 1500])('интервал %d мс', (intervalMs) => {
    const { gravity, jumpHeight } = forcesAt(intervalMs);
    const afterJump = ZONE_CENTER + jumpHeight;
    const afterFall = afterJump * Math.exp(-gravity * (intervalMs / 1000));
    expect(afterFall).toBeCloseTo(ZONE_CENTER, 9);
  });
});

describe('isBeatAccepted', () => {
  test('обычный удар принимается', () => {
    expect(isBeatAccepted({ intervalMs: 280, emaIntervalMs: 280 })).toBe(true);
  });

  test('пауза дольше max(4000, 3·μ) отбрасывается', () => {
    expect(isBeatAccepted({ intervalMs: 5000, emaIntervalMs: 280 })).toBe(false);
  });

  test('пол 4000 мс пропускает резкий переход на медленный темп', () => {
    // 3·μ = 840 мс, но пол держит приём до 4000 мс — 3000-мс удар принимается.
    expect(isBeatAccepted({ intervalMs: 3000, emaIntervalMs: 280 })).toBe(true);
  });

  test('неположительный интервал не принимается', () => {
    expect(isBeatAccepted({ intervalMs: 0, emaIntervalMs: 280 })).toBe(false);
  });
});

describe('updateTempo', () => {
  test('интервал длиннее среднего поднимает μ, короче — опускает', () => {
    const up = updateTempo({ emaIntervalMs: 280, varianceEma: 0, intervalMs: 500 });
    const down = updateTempo({ emaIntervalMs: 280, varianceEma: 0, intervalMs: 150 });
    expect(up.emaIntervalMs).toBeGreaterThan(280);
    expect(down.emaIntervalMs).toBeLessThan(280);
  });

  test('μ зажат в [MIN, MAX]', () => {
    const slow = updateTempo({ emaIntervalMs: MAX_INTERVAL_MS, varianceEma: 0, intervalMs: 100000 });
    expect(slow.emaIntervalMs).toBeLessThanOrEqual(MAX_INTERVAL_MS);
    const fast = updateTempo({ emaIntervalMs: MIN_INTERVAL_MS, varianceEma: 0, intervalMs: 1 });
    expect(fast.emaIntervalMs).toBeGreaterThanOrEqual(MIN_INTERVAL_MS);
  });

  test('разброс неотрицателен и растёт при отклонении от среднего', () => {
    const steady = updateTempo({ emaIntervalMs: 280, varianceEma: 0, intervalMs: 280 });
    const jumpy = updateTempo({ emaIntervalMs: 280, varianceEma: 0, intervalMs: 600 });
    expect(steady.varianceEma).toBeGreaterThanOrEqual(0);
    expect(jumpy.varianceEma).toBeGreaterThan(steady.varianceEma);
  });
});

describe('applyFall', () => {
  test('кромка оседает монотонно (точная экспонента)', () => {
    const once = applyFall({ level: 0.8, gravity: 2, seconds: 0.1 });
    expect(once).toBeLessThan(0.8);
    expect(once).toBeCloseTo(0.8 * Math.exp(-0.2), 9);
  });

  test('нулевая длительность не меняет уровень', () => {
    expect(applyFall({ level: 0.6, gravity: 2, seconds: 0 })).toBeCloseTo(0.6, 9);
  });

  test('приземление к нулю обнуляется', () => {
    expect(applyFall({ level: 0.00005, gravity: 2, seconds: 1 })).toBe(0);
  });
});

describe('applyJump', () => {
  test('прыжок поднимает уровень', () => {
    expect(applyJump({ level: 0.5, jumpHeight: 0.2 })).toBeCloseTo(0.7, 9);
  });

  test('прыжок зажат в потолок шкалы', () => {
    expect(applyJump({ level: 0.9, jumpHeight: 0.5 })).toBe(MAX_LEVEL);
  });
});

describe('zoneOf', () => {
  test('кромка в центре — в зоне', () => {
    expect(zoneOf({ level: ZONE_CENTER })).toBe('in');
  });

  test('выше верхней кромки зоны — above (частишь)', () => {
    expect(zoneOf({ level: ZONE_CENTER + BAND_WIDTH / 2 + 0.01 })).toBe('above');
  });

  test('ниже нижней кромки зоны — below (тормозишь)', () => {
    expect(zoneOf({ level: ZONE_CENTER - BAND_WIDTH / 2 - 0.01 })).toBe('below');
  });
});
