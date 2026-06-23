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
const notReady = (s: string, clean: number, latencyEwma: number = 200): ProfileCell => ({ symbol: s, exposures: 30, clean, latencyEwma, latencySamples: 30 });

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

  test('maturingNeeded > 0 когда не-готовых больше долгового лимита', () => {
    // Расширим LAYOUT до 4 символов шага 0 (все из jcuken step 0)
    const layoutWithMore: SymbolEntry[] = [
      { symbol: 'а', keyCaps: ['KeyF'] }, // шаг 0
      { symbol: 'о', keyCaps: ['KeyJ'] }, // шаг 0
      { symbol: 'е', keyCaps: ['KeyT'] }, // шаг 0
      { symbol: 'п', keyCaps: ['KeyG'] }, // шаг 0
      { symbol: 'в', keyCaps: ['KeyD'] }, // шаг 1
    ];
    // Никто не готов (symbolCells пусто)
    const p = computeRepertoireProgress({
      openedSteps: 1, symbolCells: [], symbolLayout: layoutWithMore, keyLadder: jcukenKeyLadder,
    });
    expect(p.totalOnStep).toBe(4); // 4 символа на шаге 0
    expect(p.readyCount).toBe(0); // никто не готов
    expect(p.maturingNeeded).toBe(2); // max(0, 4 - 2) = 2
  });

  test('blockers.accuracy — символ с низкой точностью несмотря на достаточные предъявления', () => {
    const layoutWithMore: SymbolEntry[] = [
      { symbol: 'а', keyCaps: ['KeyF'] }, // шаг 0 — низкая точность
      { symbol: 'о', keyCaps: ['KeyJ'] }, // шаг 0 — хороший
      { symbol: 'в', keyCaps: ['KeyD'] }, // шаг 1
    ];
    // 'а': 30 предъявлений, но только 20 чистых (20/30 ≈ 0.67 < 0.9)
    // 'о': готов (29/30 ≈ 0.97 ≥ 0.9)
    const p = computeRepertoireProgress({
      openedSteps: 1,
      symbolCells: [notReady('а', 20), ready('о')],
      symbolLayout: layoutWithMore,
      keyLadder: jcukenKeyLadder,
    });
    expect(p.blockers.accuracy).toBeGreaterThanOrEqual(1);
  });

  test('blockers.latency — символ медленнее медианы репертуара', () => {
    const layoutWithMore: SymbolEntry[] = [
      { symbol: 'а', keyCaps: ['KeyF'] }, // шаг 0 — медленный
      { symbol: 'о', keyCaps: ['KeyJ'] }, // шаг 0 — быстрый эталон
      { symbol: 'в', keyCaps: ['KeyD'] }, // шаг 1
    ];
    // 'о': быстрый (150ms), 'в': средний (160ms) → медиана ≈ 155
    // 'а': медленный (400ms > 1.5 × 155 = 232.5) ✓ latency-блокер
    const p = computeRepertoireProgress({
      openedSteps: 1,
      symbolCells: [
        notReady('а', 30, 400), // 400ms — медленнее медианы
        notReady('о', 30, 150), // 150ms — быстрый эталон
        notReady('в', 30, 160), // 160ms — для медианы (KeyD, шаг 1, но включаем для расчёта медианы)
      ],
      symbolLayout: layoutWithMore,
      keyLadder: jcukenKeyLadder,
    });
    expect(p.blockers.latency).toBeGreaterThanOrEqual(1);
  });
});
