import { describe, expect, it, test } from 'vitest';
import {
  layoutKeyCaps,
  symbolToKeyCaps,
  symbolToStep,
  symbolsAtStep,
  maxLadderStep,
  validateSymbolLadder,
  type SymbolEntry,
} from './symbol-layout.ts';
import jcukenLayout from '../src/layouts/symbol-layout-jcuken.json';
import qwertyLayout from '../src/layouts/symbol-layout-qwerty.json';

const SYNTH: SymbolEntry[] = [
  { symbol: ' ', keyCaps: ['Space'], ladderStep: 0 },
  { symbol: 'а', keyCaps: ['KeyF'], ladderStep: 0 },
  { symbol: 'в', keyCaps: ['KeyD'], ladderStep: 1 },
  { symbol: 'ё', keyCaps: ['Backquote'], ladderStep: 9 },
];

describe('карты раскладки', () => {
  it('layoutKeyCaps — объединение аккордов', () => {
    expect(layoutKeyCaps(SYNTH)).toEqual(new Set(['Space', 'KeyF', 'KeyD', 'Backquote']));
  });
  it('symbolToKeyCaps — символ → аккорд', () => {
    expect(symbolToKeyCaps(SYNTH).get('а')).toEqual(['KeyF']);
  });
  it('symbolToStep — только записи с шагом', () => {
    const noStep: SymbolEntry[] = [{ symbol: 'x', keyCaps: ['KeyQ'] }];
    expect(symbolToStep(noStep).size).toBe(0);
    expect(symbolToStep(SYNTH).get('ё')).toBe(9);
  });
});

describe('symbolsAtStep', () => {
  test('возвращает символы, открывающиеся ровно на шаге', () => {
    expect(symbolsAtStep({ step: 0, symbolLayout: SYNTH }).sort()).toEqual([' ', 'а']);
    expect(symbolsAtStep({ step: 1, symbolLayout: SYNTH })).toEqual(['в']);
    expect(symbolsAtStep({ step: 5, symbolLayout: SYNTH })).toEqual([]);
    expect(symbolsAtStep({ step: 9, symbolLayout: SYNTH })).toEqual(['ё']);
  });
});

describe('maxLadderStep', () => {
  test('максимальный шаг синтетической раскладки = 9', () => {
    expect(maxLadderStep(SYNTH)).toBe(9);
  });
  test('раскладка без шагов → -1', () => {
    expect(maxLadderStep([{ symbol: 'x', keyCaps: ['KeyQ'] }])).toBe(-1);
  });
});

describe('validateSymbolLadder', () => {
  it('валидная нарезка — без проблем', () => {
    expect(validateSymbolLadder(SYNTH.filter((e) => e.ladderStep! <= 1))).toEqual([]);
  });
  it('ловит символ без ladderStep', () => {
    const bad: SymbolEntry[] = [{ symbol: ' ', keyCaps: ['Space'], ladderStep: 0 }, { symbol: 'x', keyCaps: ['KeyQ'] }];
    expect(validateSymbolLadder(bad).some((p) => p.includes('нет ladderStep'))).toBe(true);
  });
  it('ловит дыру в шагах', () => {
    const bad: SymbolEntry[] = [
      { symbol: ' ', keyCaps: ['Space'], ladderStep: 0 },
      { symbol: 'в', keyCaps: ['KeyD'], ladderStep: 2 }, // шаг 1 пропущен
    ];
    expect(validateSymbolLadder(bad).some((p) => p.includes('пропущен шаг'))).toBe(true);
  });
  it('ловит пробел не на шаге 0', () => {
    const bad: SymbolEntry[] = [
      { symbol: ' ', keyCaps: ['Space'], ladderStep: 1 },
      { symbol: 'а', keyCaps: ['KeyF'], ladderStep: 0 },
    ];
    expect(validateSymbolLadder(bad).some((p) => p.includes('пробел'))).toBe(true);
  });
});

describe('реальная раскладка йцукен (анкер миграции ADR 0020)', () => {
  it('нарезка валидна: все шаги проставлены, 0..max без дыр, пробел на шаге 0', () => {
    expect(validateSymbolLadder(jcukenLayout)).toEqual([]);
  });
  it('максимальный шаг = 9 (10 ступеней, totalSteps не поехал)', () => {
    expect(maxLadderStep(jcukenLayout)).toBe(9);
  });
  it('на шаге 0 — 13 символов (пробел + указательные)', () => {
    expect(symbolsAtStep({ step: 0, symbolLayout: jcukenLayout })).toHaveLength(13);
  });
  it('Shift-взрыв сохранён 1:1: на шаге 6 — 30 символов (заглавные + запятая)', () => {
    expect(symbolsAtStep({ step: 6, symbolLayout: jcukenLayout })).toHaveLength(30);
  });
});

describe('раскладка qwerty (нарезка по аналогии с йцукен, P0-9)', () => {
  it('нарезка валидна: шаги проставлены, 0..max без дыр, пробел на шаге 0', () => {
    expect(validateSymbolLadder(qwertyLayout)).toEqual([]);
  });
  it('максимальный шаг = 9 (та же геометрия, что у йцукен)', () => {
    expect(maxLadderStep(qwertyLayout)).toBe(9);
  });
  it('на шаге 0 — 13 символов (пробел + указательные)', () => {
    expect(symbolsAtStep({ step: 0, symbolLayout: qwertyLayout })).toHaveLength(13);
  });
});
