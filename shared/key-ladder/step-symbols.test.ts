import { describe, expect, test } from 'vitest';
import { symbolsAtStep } from './step-symbols.ts';
import { jcukenKeyLadder } from './jcuken.ts';
import type { SymbolEntry } from '../symbol-layout.ts';

const SYMBOL_LAYOUT: SymbolEntry[] = [
  { symbol: ' ', keyCaps: ['Space'] },     // шаг 0
  { symbol: 'а', keyCaps: ['KeyF'] },      // шаг 0 (указательный левый)
  { symbol: 'в', keyCaps: ['KeyD'] },      // шаг 1 (средний левый)
  { symbol: 'ё', keyCaps: ['Backquote'] }, // шаг 9
];

describe('symbolsAtStep', () => {
  test('возвращает только символы, открывающиеся ровно на шаге', () => {
    expect(symbolsAtStep({ step: 0, symbolLayout: SYMBOL_LAYOUT, ladder: jcukenKeyLadder }).sort()).toEqual([' ', 'а']);
    expect(symbolsAtStep({ step: 1, symbolLayout: SYMBOL_LAYOUT, ladder: jcukenKeyLadder })).toEqual(['в']);
    expect(symbolsAtStep({ step: 5, symbolLayout: SYMBOL_LAYOUT, ladder: jcukenKeyLadder })).toEqual([]);
    expect(symbolsAtStep({ step: 9, symbolLayout: SYMBOL_LAYOUT, ladder: jcukenKeyLadder })).toEqual(['ё']);
  });
});
