import { describe, expect, test } from 'vitest';
import { maxLadderStep } from './key-step-map.ts';
import { jcukenKeyLadder } from './jcuken.ts';

describe('maxLadderStep', () => {
  test('максимальный шаг лестницы йцукен = 9', () => {
    expect(maxLadderStep(jcukenKeyLadder)).toBe(9);
  });
  test('пустая лестница → -1', () => {
    expect(maxLadderStep({ symbolLayoutId: 'x', version: 1, keys: [] })).toBe(-1);
  });
});
