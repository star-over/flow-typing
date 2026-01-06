import { describe, expect,it } from 'vitest';

import { getKeyCapIdsForChar, getSymbol, isModifierKey,isShiftRequired, isTextKey } from './symbol-utils';

describe('getKeyCapIdsForChar', () => {
  it('should return the correct KeyCapId for a lowercase character', () => {
    const keyCapIds = getKeyCapIdsForChar('a');
    expect(keyCapIds).toEqual(['KeyA']);
  });

  it('should return the correct KeyCapIds for an uppercase character', () => {
    const keyCapIds = getKeyCapIdsForChar('A');
    expect(keyCapIds).toEqual(['KeyA', 'ShiftRight']);
  });

  it('should return the correct KeyCapIds for a symbol character', () => {
    const keyCapIds = getKeyCapIdsForChar('!');
    expect(keyCapIds).toEqual(['Digit1', 'ShiftRight']);
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

describe('getSymbol', () => {
  it('should return the correct symbol for a base key with no modifiers', () => {
    expect(getSymbol('KeyA', [])).toBe('a');
  });

  it('should return the correct symbol for a base key with shift modifier', () => {
    expect(getSymbol('KeyA', ['shift'])).toBe('A');
  });

  it('should return the correct symbol for a number key with shift modifier', () => {
    expect(getSymbol('Digit1', ['shift'])).toBe('!');
  });
  
  it('should return the base symbol if a modifier combination is not found (Level 2 Fallback)', () => {
    expect(getSymbol('KeyA', ['ctrl'])).toBe('a');
  });
  
  it('should return the base symbol if multiple modifiers are not found (Level 2 Fallback)', () => {
    expect(getSymbol('KeyA', ['ctrl', 'shift'])).toBe('a');
  });

  it('should return a placeholder for a key that does not map to any symbol (Level 3 Fallback)', () => {
    // 'Escape' is a valid KeyCapId but is not in the symbol layout.
    expect(getSymbol('Escape', [])).toBe('...');
  });

  it('should return a placeholder if even the base key is not found after modifier lookup fails (Level 3 Fallback)', () => {
    // 'Escape' is a valid KeyCapId but is not in the symbol layout.
    expect(getSymbol('Escape', ['shift'])).toBe('...');
  });
});

describe('isTextKey', () => {
  it('should return true for a valid symbol KeyCapId', () => {
    expect(isTextKey('KeyA')).toBe(true);
    expect(isTextKey('Digit1')).toBe(true);
    expect(isTextKey('Comma')).toBe(true);
  });

  it('should return false for a non-symbol KeyCapId', () => {
    expect(isTextKey('ShiftLeft')).toBe(false);
    expect(isTextKey('CapsLock')).toBe(false);
    expect(isTextKey('Enter')).toBe(false);
  });

  it('should return false for an invalid or non-existent KeyCapId', () => {
    expect(isTextKey('InvalidKey')).toBe(false);
    expect(isTextKey('KeyZz')).toBe(false);
  });
});

describe('isModifierKey', () => {
  it('should return true for a valid modifier KeyCapId', () => {
    expect(isModifierKey('ShiftLeft')).toBe(true);
    expect(isModifierKey('ControlRight')).toBe(true);
    expect(isModifierKey('AltLeft')).toBe(true);
    expect(isModifierKey('MetaRight')).toBe(true);
  });

  it('should return false for a non-modifier KeyCapId', () => {
    expect(isModifierKey('KeyA')).toBe(false);
    expect(isModifierKey('Enter')).toBe(false);
    expect(isModifierKey('Tab')).toBe(false);
  });

  it('should return false for an invalid or non-existent KeyCapId', () => {
    expect(isModifierKey('InvalidKey')).toBe(false);
    expect(isModifierKey('Shift')).toBe(false);
  });
});
