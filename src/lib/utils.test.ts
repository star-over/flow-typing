import { describe, expect,it } from 'vitest';

import { KeyCapId } from '../interfaces/key-cap-id';
import { areKeyCapIdArraysEqual } from './utils';

describe('areKeyCapIdArraysEqual', () => {
  it('should return true for identical arrays', () => {
    const arr1: KeyCapId[] = ['KeyA', 'ShiftLeft'];
    const arr2: KeyCapId[] = ['KeyA', 'ShiftLeft'];
    expect(areKeyCapIdArraysEqual(arr1, arr2)).toBe(true);
  });

  it('should return true for arrays with same elements but different order', () => {
    const arr1: KeyCapId[] = ['KeyA', 'ShiftLeft'];
    const arr2: KeyCapId[] = ['ShiftLeft', 'KeyA'];
    expect(areKeyCapIdArraysEqual(arr1, arr2)).toBe(true);
  });

  it('should return true for empty arrays', () => {
    const arr1: KeyCapId[] = [];
    const arr2: KeyCapId[] = [];
    expect(areKeyCapIdArraysEqual(arr1, arr2)).toBe(true);
  });

  it('should return false for arrays with different lengths', () => {
    const arr1: KeyCapId[] = ['KeyA', 'ShiftLeft'];
    const arr2: KeyCapId[] = ['KeyA'];
    expect(areKeyCapIdArraysEqual(arr1, arr2)).toBe(false);
  });

  it('should return false for arrays with different elements', () => {
    const arr1: KeyCapId[] = ['KeyA', 'ShiftLeft'];
    const arr2: KeyCapId[] = ['KeyB', 'ShiftLeft'];
    expect(areKeyCapIdArraysEqual(arr1, arr2)).toBe(false);
  });
});