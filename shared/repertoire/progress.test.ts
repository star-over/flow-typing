import { describe, expect, test } from 'vitest';
import { computeRepertoireProgress } from './progress.ts';
import { jcukenKeyLadder } from '../key-ladder/jcuken.ts';
import type { SymbolEntry } from '../symbol-layout.ts';
import type { ProfileCell } from './readiness.ts';

const LAYOUT: SymbolEntry[] = [
  { symbol: 'а', keyCaps: ['KeyF'] }, // шаг 0
  { symbol: 'о', keyCaps: ['KeyJ'] }, // шаг 0
  { symbol: 'в', keyCaps: ['KeyD'] }, // шаг 1
];
const ready = (s: string): ProfileCell => ({ symbol: s, exposures: 30, clean: 29, latencyEwma: 200, latencySamples: 30 });

describe('computeRepertoireProgress', () => {
  test('ступень, готовность и долг по текущему шагу', () => {
    const p = computeRepertoireProgress({
      openedSteps: 1, symbolCells: [ready('а')], symbolLayout: LAYOUT, keyLadder: jcukenKeyLadder,
    });
    expect(p.openedSteps).toBe(1);
    expect(p.maxStep).toBe(9);
    expect(p.totalOnStep).toBe(2);   // 'а','о' на шаге 0 (в LAYOUT)
    expect(p.readyCount).toBe(1);    // 'а' готов
    expect(p.blockers.exposure).toBe(1); // 'о' без ячейки → не добрал предъявлений
  });

  test('maturingNeeded учитывает долговой лимит', () => {
    const p = computeRepertoireProgress({
      openedSteps: 1, symbolCells: [ready('а')], symbolLayout: LAYOUT, keyLadder: jcukenKeyLadder,
    });
    expect(p.maturingNeeded).toBe(0); // не-готовых 1 ≤ долговой лимит 2
  });
});
