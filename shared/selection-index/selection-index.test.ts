import { describe, it, expect } from 'vitest';
import { computeStepLevel } from './compute.ts';
import { symbolToStep } from '../symbol-layout.ts';
import jcukenLayout from '../../src/data/layouts/symbol-layout-jcuken.json';

describe('computeStepLevel (синтетическая карта символ→шаг)', () => {
  // Шаг живёт на символе (ADR 0020): заглавная несёт свой шаг напрямую (аккорд
  // Shift уже учтён при 1:1-переносе), отдельной карты клавиш нет.
  const symbolToStepMap = new Map([
    [' ', 0],
    ['а', 0],
    ['А', 6], // заглавная: max(шаг буквы, шаг Shift) = 6, зашито в ladderStep
  ]);

  it('макс. шаг среди символов drill\'а', () => {
    expect(computeStepLevel({ uniqueSymbols: [' ', 'а'], symbolToStep: symbolToStepMap })).toBe(0);
  });
  it('заглавная тянет шаг вверх', () => {
    expect(computeStepLevel({ uniqueSymbols: ['А', 'а'], symbolToStep: symbolToStepMap })).toBe(6);
  });
  it('символ вне раскладки / без шага — ошибка', () => {
    expect(() => computeStepLevel({ uniqueSymbols: ['z'], symbolToStep: symbolToStepMap })).toThrow();
  });
});

describe('computeStepLevel (реальные шаги йцукен из раскладки)', () => {
  const s2s = symbolToStep(jcukenLayout);
  const at = (symbols: string[]) => computeStepLevel({ uniqueSymbols: symbols, symbolToStep: s2s });

  it('слово только из указательных → шаг 0', () => {
    // т(KeyN) о(KeyJ) р(KeyH) — все указательные
    expect(at(['т', 'о', 'р'])).toBe(0);
  });
  it('заглавная буква → шаг Shift (6)', () => {
    expect(at(['Т', 'о', 'р'])).toBe(6);
  });
  it('точка тянет правый мизинец ближний (шаг 5)', () => {
    expect(at(['т', 'о', 'р', '.'])).toBe(5);
  });
});
