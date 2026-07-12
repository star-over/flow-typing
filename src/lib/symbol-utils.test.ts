import { describe, expect, it } from 'vitest';
import { getPhysicalLayout, getSymbolLayout } from '@/lib/layouts';
import { areKeyCapIdArraysEqual, getKeyCapIdsForChar, getLabel, isModifierKey, isTextKey, keyCapHasSymbol } from './symbol-utils';

const symbolLayoutQwerty = getSymbolLayout('qwerty');
const physicalLayoutANSI = getPhysicalLayout('ansi');

describe('getKeyCapIdsForChar', () => {
  it('should return the correct KeyCapId for a lowercase character', () => {
    const keyCapIds = getKeyCapIdsForChar({ char: 'a', symbolLayout: symbolLayoutQwerty });
    expect(keyCapIds).toEqual(['KeyA']);
  });

  it('should return the correct KeyCapIds for an uppercase character', () => {
    const keyCapIds = getKeyCapIdsForChar({ char: 'A', symbolLayout: symbolLayoutQwerty });
    expect(keyCapIds).toEqual(['KeyA', 'ShiftRight']);
  });

  it('should return the correct KeyCapIds for a symbol character', () => {
    const keyCapIds = getKeyCapIdsForChar({ char: '!', symbolLayout: symbolLayoutQwerty });
    expect(keyCapIds).toEqual(['Digit1', 'ShiftRight']);
  });

  it('should return the correct KeyCapId for a space character', () => {
    const keyCapIds = getKeyCapIdsForChar({ char: ' ', symbolLayout: symbolLayoutQwerty });
    expect(keyCapIds).toEqual(['Space']);
  });

  it('should return undefined for a character not in the layout', () => {
    const keyCapIds = getKeyCapIdsForChar({ char: '€', symbolLayout: symbolLayoutQwerty });
    expect(keyCapIds).toBeUndefined();
  });
});



describe('getLabel', () => {
  it('should return the uppercase symbol for a letter key', () => {
    expect(getLabel({ keyCapId: 'KeyA', symbolLayout: symbolLayoutQwerty, physicalLayout: physicalLayoutANSI })).toBe('A');
  });

  it('should return the combined label for a number key', () => {
    expect(getLabel({ keyCapId: 'Digit1', symbolLayout: symbolLayoutQwerty, physicalLayout: physicalLayoutANSI })).toBe('1 !');
  });

  it('should handle symbol keys with combined labels', () => {
    expect(getLabel({ keyCapId: 'Digit4', symbolLayout: symbolLayoutQwerty, physicalLayout: physicalLayoutANSI })).toBe('4 $');
  });

  it('should return the correct label for a modifier key', () => {
    expect(getLabel({ keyCapId: 'ShiftRight', symbolLayout: symbolLayoutQwerty, physicalLayout: physicalLayoutANSI })).toBe('Shift R');
  });

  it('should return a placeholder if a key is not in any layout', () => {
    expect(getLabel({ keyCapId: 'Escape', symbolLayout: symbolLayoutQwerty, physicalLayout: physicalLayoutANSI })).toBe('...');
  });
});

describe('isTextKey', () => {
  it('should return true for a valid symbol KeyCapId', () => {
    expect(isTextKey({ key: 'KeyA', physicalLayout: physicalLayoutANSI })).toBe(true);
    expect(isTextKey({ key: 'Digit1', physicalLayout: physicalLayoutANSI })).toBe(true);
    expect(isTextKey({ key: 'Comma', physicalLayout: physicalLayoutANSI })).toBe(true);
  });

  it('should return false for a non-symbol KeyCapId', () => {
    expect(isTextKey({ key: 'ShiftLeft', physicalLayout: physicalLayoutANSI })).toBe(false);
    expect(isTextKey({ key: 'CapsLock', physicalLayout: physicalLayoutANSI })).toBe(false);
    expect(isTextKey({ key: 'Enter', physicalLayout: physicalLayoutANSI })).toBe(false);
  });

  it('should return false for an invalid or non-existent KeyCapId', () => {
    expect(isTextKey({ key: 'InvalidKey', physicalLayout: physicalLayoutANSI })).toBe(false);
    expect(isTextKey({ key: 'KeyZz', physicalLayout: physicalLayoutANSI })).toBe(false);
  });
});

describe('isModifierKey', () => {
  it('should return true for a valid modifier KeyCapId', () => {
    expect(isModifierKey({ key: 'ShiftLeft', physicalLayout: physicalLayoutANSI })).toBe(true);
    expect(isModifierKey({ key: 'ControlRight', physicalLayout: physicalLayoutANSI })).toBe(true);
    expect(isModifierKey({ key: 'AltLeft', physicalLayout: physicalLayoutANSI })).toBe(true);
    expect(isModifierKey({ key: 'MetaRight', physicalLayout: physicalLayoutANSI })).toBe(true);
  });

  it('should return false for a non-modifier KeyCapId', () => {
    expect(isModifierKey({ key: 'KeyA', physicalLayout: physicalLayoutANSI })).toBe(false);
    expect(isModifierKey({ key: 'Enter', physicalLayout: physicalLayoutANSI })).toBe(false);
    expect(isModifierKey({ key: 'Tab', physicalLayout: physicalLayoutANSI })).toBe(false);
  });

  it('should return false for an invalid or non-existent KeyCapId', () => {
    expect(isModifierKey({ key: 'InvalidKey', physicalLayout: physicalLayoutANSI })).toBe(false);
    expect(isModifierKey({ key: 'Shift', physicalLayout: physicalLayoutANSI })).toBe(false);
  });
});

describe('keyCapHasSymbol', () => {
  it('should return true for a key that carries a base symbol', () => {
    expect(keyCapHasSymbol({ keyCapId: 'KeyQ', symbolLayout: symbolLayoutQwerty })).toBe(true);
    expect(keyCapHasSymbol({ keyCapId: 'KeyA', symbolLayout: symbolLayoutQwerty })).toBe(true);
    expect(keyCapHasSymbol({ keyCapId: 'Digit1', symbolLayout: symbolLayoutQwerty })).toBe(true);
  });

  it('should return false for a modifier that appears only inside Shift chords', () => {
    // ShiftLeft/ShiftRight существуют в раскладке лишь как член пары (`['ShiftRight', 'KeyX']`),
    // одиночного entry у них нет — базовый символ не несут.
    expect(keyCapHasSymbol({ keyCapId: 'ShiftLeft', symbolLayout: symbolLayoutQwerty })).toBe(false);
    expect(keyCapHasSymbol({ keyCapId: 'ShiftRight', symbolLayout: symbolLayoutQwerty })).toBe(false);
  });

  it('should return false for system keys absent from the layout', () => {
    expect(keyCapHasSymbol({ keyCapId: 'Tab', symbolLayout: symbolLayoutQwerty })).toBe(false);
    expect(keyCapHasSymbol({ keyCapId: 'CapsLock', symbolLayout: symbolLayoutQwerty })).toBe(false);
    expect(keyCapHasSymbol({ keyCapId: 'Enter', symbolLayout: symbolLayoutQwerty })).toBe(false);
    expect(keyCapHasSymbol({ keyCapId: 'Backspace', symbolLayout: symbolLayoutQwerty })).toBe(false);
  });
});

describe('areKeyCapIdArraysEqual', () => {
  it('should return true for arrays with the same elements in the same order', () => {
    expect(areKeyCapIdArraysEqual({ a: ['KeyA', 'ShiftLeft'], b: ['KeyA', 'ShiftLeft'] })).toBe(true);
  });

  it('should return true for arrays with the same elements in a different order', () => {
    expect(areKeyCapIdArraysEqual({ a: ['KeyA', 'ShiftLeft'], b: ['ShiftLeft', 'KeyA'] })).toBe(true);
  });

  it('should return false for arrays of different lengths', () => {
    expect(areKeyCapIdArraysEqual({ a: ['KeyA', 'ShiftLeft'], b: ['KeyA'] })).toBe(false);
  });

  it('should return false for arrays with different elements', () => {
    expect(areKeyCapIdArraysEqual({ a: ['KeyA', 'ShiftLeft'], b: ['KeyB', 'ShiftLeft'] })).toBe(false);
  });

  it('should return true for two empty arrays', () => {
    expect(areKeyCapIdArraysEqual({ a: [], b: [] })).toBe(true);
  });

  it('should return false when one array is a subset of another', () => {
    expect(areKeyCapIdArraysEqual({ a: ['KeyA', 'ShiftLeft'], b: ['KeyA'] })).toBe(false);
    expect(areKeyCapIdArraysEqual({ a: ['KeyA'], b: ['KeyA', 'ShiftLeft'] })).toBe(false);
  });
});
