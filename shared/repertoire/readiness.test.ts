import { describe, expect, test } from 'vitest';
import { isSymbolReady, repertoireMedianLatency, type ProfileCell } from './readiness.ts';

const PARAMS = { minExposures: 20, minFirstTryAccuracy: 0.9, latencyK: 1.5 };
const cell = (over: Partial<ProfileCell>): ProfileCell => ({
  symbol: 'а', exposures: 30, clean: 29, latencyEwma: 200, latencySamples: 30, ...over,
});

describe('repertoireMedianLatency', () => {
  test('нечётное число — средний элемент', () => {
    expect(repertoireMedianLatency([
      cell({ symbol: 'а', latencyEwma: 100 }),
      cell({ symbol: 'б', latencyEwma: 300 }),
      cell({ symbol: 'в', latencyEwma: 0, latencySamples: 0 }), // без замеров — вне медианы
    ])).toBe(200);
  });
  test('чётное число — среднее двух средних', () => {
    expect(repertoireMedianLatency([
      cell({ symbol: 'а', latencyEwma: 100 }),
      cell({ symbol: 'б', latencyEwma: 200 }),
      cell({ symbol: 'в', latencyEwma: 300 }),
      cell({ symbol: 'г', latencyEwma: 500 }),
    ])).toBe(250); // (200+300)/2
  });
  test('нет замеров — 0', () => {
    expect(repertoireMedianLatency([cell({ latencySamples: 0, latencyEwma: 0 })])).toBe(0);
  });
});

describe('isSymbolReady', () => {
  test('нет ячейки — не готов', () => {
    expect(isSymbolReady({ cell: undefined, params: PARAMS, repertoireMedianLatency: 200 })).toBe(false);
  });
  test('мало предъявлений — не готов', () => {
    expect(isSymbolReady({ cell: cell({ exposures: 10, clean: 10 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(false);
  });
  test('низкая точность с первой попытки — не готов', () => {
    expect(isSymbolReady({ cell: cell({ exposures: 30, clean: 20 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(false);
  });
  test('латентность хуже k× медианы — не готов', () => {
    expect(isSymbolReady({ cell: cell({ latencyEwma: 400 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(false);
  });
  test('латентность ровно на границе k× медианы — готов (<=)', () => {
    expect(isSymbolReady({ cell: cell({ latencyEwma: 300 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(true);
  });
  test('все условия выполнены — готов', () => {
    expect(isSymbolReady({ cell: cell({ latencyEwma: 250 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(true);
  });
  test('нет собственных замеров латентности — судим по предъявлениям и точности', () => {
    expect(isSymbolReady({ cell: cell({ latencySamples: 0, latencyEwma: 0 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(true);
  });
});
