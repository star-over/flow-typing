import { describe, it, expect } from 'vitest';
import type { KeyLadder } from './types.ts';
import { validateKeyLadder } from './validate.ts';
import { jcukenKeyLadder } from './jcuken.ts';
import { layoutKeyCaps } from '../symbol-layout.ts';
import jcukenLayout from '../../src/data/layouts/symbol-layout-jcuken.json';

const CAPS = new Set(['Space', 'KeyF', 'KeyJ']);
const valid: KeyLadder = {
  symbolLayoutId: 'x',
  version: 1,
  keys: [
    { keyCapId: 'Space', step: 0 },
    { keyCapId: 'KeyF', step: 0 },
    { keyCapId: 'KeyJ', step: 1 },
  ],
};

describe('validateKeyLadder', () => {
  it('валидная лестница — без проблем', () => {
    expect(validateKeyLadder({ ladder: valid, layoutKeyCaps: CAPS })).toEqual([]);
  });
  it('ловит непокрытую клавишу раскладки', () => {
    const ladder = { ...valid, keys: valid.keys.slice(0, 2) }; // нет KeyJ
    expect(validateKeyLadder({ ladder, layoutKeyCaps: CAPS }).some((p) => p.includes('не покрыта'))).toBe(true);
  });
  it('ловит дубль клавиши', () => {
    const ladder = { ...valid, keys: [...valid.keys, { keyCapId: 'KeyF', step: 1 }] };
    expect(validateKeyLadder({ ladder, layoutKeyCaps: CAPS }).some((p) => p.includes('дубль'))).toBe(true);
  });
  it('ловит клавишу вне раскладки', () => {
    const ladder = { ...valid, keys: [...valid.keys, { keyCapId: 'KeyZ', step: 1 }] };
    expect(validateKeyLadder({ ladder, layoutKeyCaps: CAPS }).some((p) => p.includes('вне раскладки'))).toBe(true);
  });
  it('ловит дыру в шагах', () => {
    const ladder = {
      ...valid,
      keys: [
        { keyCapId: 'Space', step: 0 },
        { keyCapId: 'KeyF', step: 0 },
        { keyCapId: 'KeyJ', step: 2 }, // шаг 1 пропущен
      ],
    };
    expect(validateKeyLadder({ ladder, layoutKeyCaps: CAPS }).some((p) => p.includes('пропущен шаг'))).toBe(true);
  });
  it('ловит Space не в шаге 0', () => {
    const ladder = {
      ...valid,
      keys: [
        { keyCapId: 'Space', step: 1 },
        { keyCapId: 'KeyF', step: 0 },
        { keyCapId: 'KeyJ', step: 1 },
      ],
    };
    expect(validateKeyLadder({ ladder, layoutKeyCaps: CAPS }).some((p) => p.includes('Space'))).toBe(true);
  });
});

describe('jcukenKeyLadder', () => {
  it('покрывает реальную раскладку йцукен без проблем', () => {
    const caps = layoutKeyCaps(jcukenLayout);
    expect(validateKeyLadder({ ladder: jcukenKeyLadder, layoutKeyCaps: caps })).toEqual([]);
  });
});
