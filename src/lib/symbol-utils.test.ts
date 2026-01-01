import { describe, expect,it } from 'vitest';

import { getKeyCapIdsForChar, isModifierKey,isShiftRequired, isTextKey } from './symbol-utils';

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
