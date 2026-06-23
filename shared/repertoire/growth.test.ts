import { describe, expect, test } from 'vitest';
import { decideOpenedSteps } from './growth.ts';
import type { ProfileCell } from './readiness.ts';

const PARAMS = { minExposures: 20, minFirstTryAccuracy: 0.9, latencyK: 1.5 };
const ready = (symbol: string): ProfileCell => ({ symbol, exposures: 30, clean: 29, latencyEwma: 200, latencySamples: 30 });
const weak = (symbol: string): ProfileCell => ({ symbol, exposures: 5, clean: 2, latencyEwma: 0, latencySamples: 0 });

describe('decideOpenedSteps — монотонный рост по долговому лимиту', () => {
  test('все символы шага готовы → +1', () => {
    expect(decideOpenedSteps({ openedSteps: 1, maxStep: 9, currentStepSymbols: ['а', 'о'],
      cells: [ready('а'), ready('о')], params: PARAMS, debtLimit: 2 })).toBe(2);
  });
  test('недозревших ≤ лимита → растём (предохранитель)', () => {
    expect(decideOpenedSteps({ openedSteps: 1, maxStep: 9, currentStepSymbols: ['а', 'о', 'е'],
      cells: [ready('а'), weak('о'), weak('е')], params: PARAMS, debtLimit: 2 })).toBe(2);
  });
  test('недозревших больше лимита → не растём', () => {
    expect(decideOpenedSteps({ openedSteps: 1, maxStep: 9, currentStepSymbols: ['а', 'о', 'е'],
      cells: [weak('а'), weak('о'), weak('е')], params: PARAMS, debtLimit: 2 })).toBe(1);
  });
  test('потолок лестницы: openedSteps > maxStep → не растём', () => {
    expect(decideOpenedSteps({ openedSteps: 10, maxStep: 9, currentStepSymbols: ['ё'],
      cells: [ready('ё')], params: PARAMS, debtLimit: 2 })).toBe(10);
  });
  test('нет символов текущего шага → не растём', () => {
    expect(decideOpenedSteps({ openedSteps: 5, maxStep: 9, currentStepSymbols: [],
      cells: [], params: PARAMS, debtLimit: 2 })).toBe(5);
  });
});
