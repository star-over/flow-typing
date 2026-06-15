import { describe, it, expect } from 'vitest';
import { computeStepLevel } from './compute.ts';
import { keyStepMap } from '../key-ladder/key-step-map.ts';
import { jcukenKeyLadder } from '../key-ladder/jcuken.ts';
import { symbolToKeyCaps } from '../symbol-layout.ts';
import jcukenLayout from '../../src/data/layouts/symbol-layout-jcuken.json';

describe('computeStepLevel (синтетические карты)', () => {
  const symKeys = new Map([
    [' ', ['Space']],
    ['а', ['KeyF']],
    ['А', ['KeyF', 'ShiftRight']],
  ]);
  const keySteps = new Map([
    ['Space', 0],
    ['KeyF', 0],
    ['ShiftRight', 6],
  ]);

  it('макс. шаг среди клавиш символов', () => {
    expect(computeStepLevel({ uniqueSymbols: [' ', 'а'], symbolToKeyCaps: symKeys, keyToStep: keySteps })).toBe(0);
  });
  it('заглавная тянет шаг Shift через аккорд', () => {
    expect(computeStepLevel({ uniqueSymbols: ['А', 'а'], symbolToKeyCaps: symKeys, keyToStep: keySteps })).toBe(6);
  });
  it('символ вне раскладки — ошибка', () => {
    expect(() => computeStepLevel({ uniqueSymbols: ['z'], symbolToKeyCaps: symKeys, keyToStep: keySteps })).toThrow();
  });
  it('клавиша вне KeyLadder — ошибка', () => {
    const partial = new Map([['щ', ['KeyO']]]);
    expect(() => computeStepLevel({ uniqueSymbols: ['щ'], symbolToKeyCaps: partial, keyToStep: keySteps })).toThrow();
  });
});

describe('computeStepLevel (реальные йцукен + KeyLadder)', () => {
  const s2k = symbolToKeyCaps(jcukenLayout);
  const k2s = keyStepMap(jcukenKeyLadder);
  const at = (symbols: string[]) => computeStepLevel({ uniqueSymbols: symbols, symbolToKeyCaps: s2k, keyToStep: k2s });

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
