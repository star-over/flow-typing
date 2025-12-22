import { describe, it, expect } from 'vitest';
import { getKeyCapIdsForChar, isKeyCapIdSymbol, isShiftRequired } from './symbol-utils';

describe('getKeyCapIdsForChar', () => {
  it('should return the correct KeyCapId for a lowercase character', () => {
    const keyCapIds = getKeyCapIdsForChar('a');
    expect(keyCapIds).toEqual(['KeyA']);
  });

  it('should return the correct KeyCapIds for an uppercase character', () => {
    const keyCapIds = getKeyCapIdsForChar('A');
    expect(keyCapIds).toEqual(['KeyA', 'ShiftLeft']);
  });

  it('should return the correct KeyCapIds for a symbol character', () => {
    const keyCapIds = getKeyCapIdsForChar('!');
    expect(keyCapIds).toEqual(['Digit1', 'ShiftLeft']);
  });

  it('should return the correct KeyCapId for a space character', () => {
    const keyCapIds = getKeyCapIdsForChar(' ');
    expect(keyCapIds).toEqual(['Space']);
  });

  it('should return undefined for a character not in the layout', () => {
    const keyCapIds = getKeyCapIdsForChar('€');
    expect(keyCapIds).toBeUndefined();
  });
});

describe('isShiftRequired', () => {
  it('should return false for a lowercase character', () => {
    expect(isShiftRequired('a')).toBe(false);
  });

  it('should return true for an uppercase character', () => {
    expect(isShiftRequired('A')).toBe(true);
  });

  it('should return true for a shifted symbol character', () => {
    expect(isShiftRequired('!')).toBe(true);
  });

  it('should return false for an unshifted symbol character', () => {
    expect(isShiftRequired('1')).toBe(false);
  });

  it('should return false for a space character', () => {
    expect(isShiftRequired(' ')).toBe(false);
  });

  it('should return false for a character not in the layout', () => {
    expect(isShiftRequired('€')).toBe(false);
  });
});

describe('isKeyCapIdSymbol', () => {
  it('should return true for a valid symbol KeyCapId', () => {
    expect(isKeyCapIdSymbol('KeyA')).toBe(true);
    expect(isKeyCapIdSymbol('Digit1')).toBe(true);
    expect(isKeyCapIdSymbol('Comma')).toBe(true);
  });

  it('should return false for a non-symbol KeyCapId', () => {
    expect(isKeyCapIdSymbol('ShiftLeft')).toBe(false);
    expect(isKeyCapIdSymbol('CapsLock')).toBe(false);
    expect(isKeyCapIdSymbol('Enter')).toBe(false);
  });

  it('should return false for an invalid or non-existent KeyCapId', () => {
    expect(isKeyCapIdSymbol('InvalidKey')).toBe(false);
    expect(isKeyCapIdSymbol('KeyZz')).toBe(false);
  });
});
