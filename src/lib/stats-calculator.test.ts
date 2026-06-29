// src/lib/stats-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { accuracyPercent, lessonStatsFromSummary } from './stats-calculator';
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

describe('lessonStatsFromSummary', () => {
  it('переводит durationMs в секунды и cpm/wpm', () => {
    const stats = lessonStatsFromSummary(summary({ exposures: 200, clean: 190, cpm: 194, durationMs: 60_000 }));
    expect(stats.durationInSeconds).toBe(60);
    expect(stats.cpm).toBe(194);
    expect(stats.wpm).toBe(194 / 5);
  });

  it('точность = clean / exposures * 100', () => {
    const stats = lessonStatsFromSummary(summary({ exposures: 200, clean: 191 }));
    expect(stats.accuracy).toBeCloseTo(95.5, 5);
  });

  it('пустая сессия (exposures = 0) → точность 0, без деления на ноль', () => {
    const stats = lessonStatsFromSummary(summary({ exposures: 0, clean: 0 }));
    expect(stats.accuracy).toBe(0);
  });

  it('значения сырые (без округления) — округляет отображающий слой, как в /stats', () => {
    const stats = lessonStatsFromSummary(summary({ exposures: 3, clean: 2, cpm: 123.456, durationMs: 1234 }));
    expect(stats.durationInSeconds).toBe(1.234);
    expect(stats.cpm).toBe(123.456);
    expect(stats.accuracy).toBeCloseTo((2 / 3) * 100, 5);
  });
});
