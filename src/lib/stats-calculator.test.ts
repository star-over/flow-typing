// src/lib/stats-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { accuracyPercent, paceInMotionFromLatency, sessionStatsFromSummary } from './stats-calculator';
import type { SessionSummaryPayload } from './session-summarize';

const summary = (over: Partial<SessionSummaryPayload> = {}): SessionSummaryPayload => ({
  exposures: 0,
  clean: 0,
  cpm: 0,
  durationMs: 0,
  latencyMedianMs: 0,
  confusions: [],
  ...over,
});

describe('accuracyPercent', () => {
  it('доля чистых первого нажатия × 100', () => {
    expect(accuracyPercent({ exposures: 200, clean: 191 })).toBeCloseTo(95.5, 5);
  });

  it('нулевые exposures → 0 (без деления на ноль)', () => {
    expect(accuracyPercent({ exposures: 0, clean: 0 })).toBe(0);
  });
});

describe('paceInMotionFromLatency', () => {
  it('60000 / медиану = зн/мин в движении', () => {
    expect(paceInMotionFromLatency(340)).toBeCloseTo(176.47, 2);
  });

  it('нет замеров латентности → undefined, а не Infinity', () => {
    expect(paceInMotionFromLatency(0)).toBeUndefined();
    expect(paceInMotionFromLatency(-1)).toBeUndefined();
  });
});

describe('sessionStatsFromSummary', () => {
  it('переводит durationMs в секунды', () => {
    const stats = sessionStatsFromSummary(summary({ exposures: 200, clean: 190, durationMs: 60_000 }));
    expect(stats.elapsedSeconds).toBe(60);
  });

  it('точность = clean / exposures * 100', () => {
    const stats = sessionStatsFromSummary(summary({ exposures: 200, clean: 191 }));
    expect(stats.accuracy).toBeCloseTo(95.5, 5);
  });

  it('пустая сессия (exposures = 0) → точность 0, без деления на ноль', () => {
    const stats = sessionStatsFromSummary(summary({ exposures: 0, clean: 0 }));
    expect(stats.accuracy).toBe(0);
  });

  it('промахи — штуками: exposures − clean', () => {
    const stats = sessionStatsFromSummary(summary({ exposures: 72, clean: 64 }));
    expect(stats.misses).toBe(8);
    expect(stats.exposures).toBe(72);
  });

  it('доносит ритм и латентность — их роняли, и это была потеря двух профильных метрик', () => {
    const stats = sessionStatsFromSummary(summary({ latencyMedianMs: 340, rhythm: 82 }));
    expect(stats.rhythm).toBe(82);
    expect(stats.latencyMedianMs).toBe(340);
    expect(stats.paceInMotion).toBeCloseTo(176.47, 2);
  });

  it('ритма нет в сводке (мало интервалов / старая строка) → undefined, не 0', () => {
    const stats = sessionStatsFromSummary(summary({ exposures: 10, clean: 10 }));
    expect(stats.rhythm).toBeUndefined();
  });

  it('значения сырые (без округления) — округляет отображающий слой, как в /stats', () => {
    const stats = sessionStatsFromSummary(summary({ exposures: 3, clean: 2, durationMs: 1234 }));
    expect(stats.elapsedSeconds).toBe(1.234);
    expect(stats.accuracy).toBeCloseTo((2 / 3) * 100, 5);
  });
});
