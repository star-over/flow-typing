import { describe, expect,it } from 'vitest';

import { fingerLayoutASDF } from '@/data/finger-layout-asdf'; // Import fingerLayoutASDF
import { symbolLayoutEnQwerty } from '@/data/symbol-layout-en-qwerty';

import { keyboardLayoutANSI } from '../data/keyboard-layout-ansi';
import { getFingerByKeyCap,getKeyCapIdsForChar, getSymbol, isModifierKey,isShiftRequired, isTextKey } from './symbol-utils'; // Import getFingerByKeyCap

describe('getKeyCapIdsForChar', () => {
  it('should return the correct KeyCapId for a lowercase character', () => {
    const keyCapIds = getKeyCapIdsForChar('a', symbolLayoutEnQwerty);
    expect(keyCapIds).toEqual(['KeyA']);
  });

  it('should return the correct KeyCapIds for an uppercase character', () => {
    const keyCapIds = getKeyCapIdsForChar('A', symbolLayoutEnQwerty);
    expect(keyCapIds).toEqual(['KeyA', 'ShiftRight']);
  });

  it('should return the correct KeyCapIds for a symbol character', () => {
    const keyCapIds = getKeyCapIdsForChar('!', symbolLayoutEnQwerty);
    expect(keyCapIds).toEqual(['Digit1', 'ShiftRight']);
  });

  it('should return the correct KeyCapId for a space character', () => {
    const keyCapIds = getKeyCapIdsForChar(' ', symbolLayoutEnQwerty);
    expect(keyCapIds).toEqual(['Space']);
  });

  it('should return undefined for a character not in the layout', () => {
    const keyCapIds = getKeyCapIdsForChar('€', symbolLayoutEnQwerty);
    expect(keyCapIds).toBeUndefined();
  });
});

describe('isShiftRequired', () => {
  it('should return false for a lowercase character', () => {
    expect(isShiftRequired('a', symbolLayoutEnQwerty)).toBe(false);
  });

  it('should return true for an uppercase character', () => {
    expect(isShiftRequired('A', symbolLayoutEnQwerty)).toBe(true);
  });

  it('should return true for a shifted symbol character', () => {
    expect(isShiftRequired('!', symbolLayoutEnQwerty)).toBe(true);
  });

  it('should return false for an unshifted symbol character', () => {
    expect(isShiftRequired('1', symbolLayoutEnQwerty)).toBe(false);
  });

  it('should return false for a space character', () => {
    expect(isShiftRequired(' ', symbolLayoutEnQwerty)).toBe(false);
  });

  it('should return false for a character not in the layout', () => {
    expect(isShiftRequired('€', symbolLayoutEnQwerty)).toBe(false);
  });
});

describe('getSymbol', () => {
  it('should return the uppercase symbol for a letter key with no modifiers', () => {
    expect(getSymbol('KeyA', [], symbolLayoutEnQwerty, keyboardLayoutANSI)).toBe('A');
  });

  it('should return the shifted symbol for a letter key with shift modifier', () => {
    expect(getSymbol('KeyA', ['shift'], symbolLayoutEnQwerty, keyboardLayoutANSI)).toBe('A');
  });

  it('should return the combined label for a number key with no modifiers', () => {
    expect(getSymbol('Digit1', [], symbolLayoutEnQwerty, keyboardLayoutANSI)).toBe('1\u202F!');
  });

  it('should return the shifted symbol for a number key with shift modifier', () => {
    expect(getSymbol('Digit1', ['shift'], symbolLayoutEnQwerty, keyboardLayoutANSI)).toBe('!');
  });

  it('should return the default label if a non-shift modifier is active', () => {
    expect(getSymbol('KeyA', ['ctrl'], symbolLayoutEnQwerty, keyboardLayoutANSI)).toBe('A');
    expect(getSymbol('Digit4', ['alt'], symbolLayoutEnQwerty, keyboardLayoutANSI)).toBe('4\u202F$');
  });

  it('should return the shifted symbol if multiple modifiers including shift are active', () => {
    expect(getSymbol('KeyA', ['ctrl', 'shift'], symbolLayoutEnQwerty, keyboardLayoutANSI)).toBe('A');
  });

  it('should return the correct label for a modifier key', () => {
    expect(getSymbol('ShiftRight', [], symbolLayoutEnQwerty, keyboardLayoutANSI)).toBe('Shift R');
  });

  it('should return a placeholder if a key is not in any layout', () => {
    expect(getSymbol('Escape', ['shift'], symbolLayoutEnQwerty, keyboardLayoutANSI)).toBe('...');
  });
});

describe('isTextKey', () => {
  it('should return true for a valid symbol KeyCapId', () => {
    expect(isTextKey('KeyA', keyboardLayoutANSI)).toBe(true);
    expect(isTextKey('Digit1', keyboardLayoutANSI)).toBe(true);
    expect(isTextKey('Comma', keyboardLayoutANSI)).toBe(true);
  });

  it('should return false for a non-symbol KeyCapId', () => {
    expect(isTextKey('ShiftLeft', keyboardLayoutANSI)).toBe(false);
    expect(isTextKey('CapsLock', keyboardLayoutANSI)).toBe(false);
    expect(isTextKey('Enter', keyboardLayoutANSI)).toBe(false);
  });

  it('should return false for an invalid or non-existent KeyCapId', () => {
    expect(isTextKey('InvalidKey', keyboardLayoutANSI)).toBe(false);
    expect(isTextKey('KeyZz', keyboardLayoutANSI)).toBe(false);
  });
});

describe('isModifierKey', () => {
  it('should return true for a valid modifier KeyCapId', () => {
    expect(isModifierKey('ShiftLeft', keyboardLayoutANSI)).toBe(true);
    expect(isModifierKey('ControlRight', keyboardLayoutANSI)).toBe(true);
    expect(isModifierKey('AltLeft', keyboardLayoutANSI)).toBe(true);
    expect(isModifierKey('MetaRight', keyboardLayoutANSI)).toBe(true);
  });

  it('should return false for a non-modifier KeyCapId', () => {
    expect(isModifierKey('KeyA', keyboardLayoutANSI)).toBe(false);
    expect(isModifierKey('Enter', keyboardLayoutANSI)).toBe(false);
    expect(isModifierKey('Tab', keyboardLayoutANSI)).toBe(false);
  });

  it('should return false for an invalid or non-existent KeyCapId', () => {
    expect(isModifierKey('InvalidKey', keyboardLayoutANSI)).toBe(false);
    expect(isModifierKey('Shift', keyboardLayoutANSI)).toBe(false);
  });
});

describe('getFingerByKeyCap', () => {
  it('should return the correct fingerId for a given KeyCapId', () => {
    expect(getFingerByKeyCap('KeyA', fingerLayoutASDF)).toBe('L5');
    expect(getFingerByKeyCap('KeyJ', fingerLayoutASDF)).toBe('R2');
    expect(getFingerByKeyCap('Space', fingerLayoutASDF)).toBe('R1');
  });

  it('should return undefined for a KeyCapId not in the finger layout', () => {
    expect(getFingerByKeyCap('Unknown', fingerLayoutASDF)).toBeUndefined();
  });
});
