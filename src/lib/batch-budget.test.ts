import { describe, expect, test } from 'vitest';
import { computeBudgetChars, BATCH_WINDOW_SECONDS } from './batch-budget';

describe('computeBudgetChars', () => {
  test('окно × скорость / 60: 90с при 200 cpm = 300 знаков', () => {
    expect(computeBudgetChars({ secondsRemaining: 90, cpm: 200, windowSeconds: 90 })).toBe(300);
  });

  test('остаток меньше окна — бюджет по остатку', () => {
    expect(computeBudgetChars({ secondsRemaining: 30, cpm: 200, windowSeconds: 90 })).toBe(100);
  });

  test('остаток больше окна — режется окном (последняя порция не «за край»)', () => {
    expect(computeBudgetChars({ secondsRemaining: 600, cpm: 200, windowSeconds: 90 })).toBe(300);
  });

  test('окно по умолчанию — константа BATCH_WINDOW_SECONDS', () => {
    expect(BATCH_WINDOW_SECONDS).toBe(15);
    // min(600, 15) × 200 / 60 = 50 знаков — целевая порция первого этапа.
    expect(computeBudgetChars({ secondsRemaining: 600, cpm: 200 })).toBe(50);
  });

  test('всегда хотя бы 1 знак — порция непустая даже у нулевого остатка', () => {
    expect(computeBudgetChars({ secondsRemaining: 0, cpm: 200, windowSeconds: 90 })).toBe(1);
  });

  test('отрицательный остаток трактуется как ноль', () => {
    expect(computeBudgetChars({ secondsRemaining: -10, cpm: 200, windowSeconds: 90 })).toBe(1);
  });
});
