import { describe, expect, test } from 'vitest';
import { evaluateStepReadiness, isSymbolReady, readinessGaps, repertoireMedianLatency, type ProfileCell } from './readiness.ts';

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

describe('readinessGaps', () => {
  const P = { minExposures: 20, minFirstTryAccuracy: 0.9, latencyK: 1.5 };
  test('нет ячейки — все три условия не выполнены', () => {
    expect(readinessGaps({ cell: undefined, params: P, repertoireMedianLatency: 200 }))
      .toEqual({ exposure: true, accuracy: true, latency: true });
  });
  test('готовый символ — условия не нарушены', () => {
    expect(readinessGaps({ cell: { symbol: 'а', exposures: 30, clean: 29, latencyEwma: 200, latencySamples: 30 }, params: P, repertoireMedianLatency: 200 }))
      .toEqual({ exposure: false, accuracy: false, latency: false });
  });
  test('мало предъявлений → точность/латентность не оценивать (нет данных)', () => {
    expect(readinessGaps({ cell: { symbol: 'а', exposures: 5, clean: 5, latencyEwma: 0, latencySamples: 0 }, params: P, repertoireMedianLatency: 200 }))
      .toEqual({ exposure: true, accuracy: false, latency: false });
  });
  test('хватает предъявлений, низкая точность → accuracy не выполнено', () => {
    expect(readinessGaps({ cell: { symbol: 'а', exposures: 30, clean: 20, latencyEwma: 200, latencySamples: 30 }, params: P, repertoireMedianLatency: 200 }))
      .toMatchObject({ exposure: false, accuracy: true });
  });
  test('медленнее k× медианы → latency не выполнено', () => {
    expect(readinessGaps({ cell: { symbol: 'а', exposures: 30, clean: 29, latencyEwma: 400, latencySamples: 30 }, params: P, repertoireMedianLatency: 200 }))
      .toMatchObject({ latency: true });
  });
});

describe('evaluateStepReadiness', () => {
  test('готовый символ — ready:true, все gaps false', () => {
    const { symbols } = evaluateStepReadiness({
      currentStepSymbols: ['а'],
      cells: [cell({ symbol: 'а', latencyEwma: 250 })],
      params: PARAMS,
    });
    expect(symbols).toHaveLength(1);
    expect(symbols[0]).toMatchObject({
      symbol: 'а',
      gaps: { exposure: false, accuracy: false, latency: false },
      ready: true,
    });
  });
  test('отсутствующая ячейка — ready:false, все gaps true, cell undefined', () => {
    const { symbols } = evaluateStepReadiness({
      currentStepSymbols: ['я'],
      cells: [cell({ symbol: 'а', latencyEwma: 200 })],
      params: PARAMS,
    });
    expect(symbols[0]).toEqual({
      symbol: 'я',
      cell: undefined,
      gaps: { exposure: true, accuracy: true, latency: true },
      ready: false,
    });
  });
  test('repertoireMedianLatency в результате = медиана входных cells', () => {
    const { repertoireMedianLatency: median } = evaluateStepReadiness({
      currentStepSymbols: ['а'],
      cells: [
        cell({ symbol: 'а', latencyEwma: 100 }),
        cell({ symbol: 'б', latencyEwma: 300 }),
        cell({ symbol: 'в', latencyEwma: 0, latencySamples: 0 }), // без замеров — вне медианы
      ],
      params: PARAMS,
    });
    expect(median).toBe(200);
  });
  test('порядок symbols соответствует currentStepSymbols', () => {
    const { symbols } = evaluateStepReadiness({
      currentStepSymbols: ['в', 'а', 'б'],
      cells: [
        cell({ symbol: 'а' }),
        cell({ symbol: 'б' }),
        cell({ symbol: 'в' }),
      ],
      params: PARAMS,
    });
    expect(symbols.map((s) => s.symbol)).toEqual(['в', 'а', 'б']);
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
