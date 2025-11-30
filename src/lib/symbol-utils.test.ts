import { describe, it, expect } from 'vitest';
import { getSymbolKeyForChar, isKeyCapIdSymbol } from './symbol-utils';

describe('getSymbolKeyForChar', () => {
  it('should return the correct SymbolKey for a lowercase character', () => {
    const symbolKey = getSymbolKeyForChar('a');
    expect(symbolKey).toBeDefined();
    expect(symbolKey?.symbol).toBe('a');
    expect(symbolKey?.keyCapId).toBe('KeyA');
    expect(symbolKey?.shift).toBe(false);
  });

  it('should return the correct SymbolKey for an uppercase character', () => {
    const symbolKey = getSymbolKeyForChar('A');
    expect(symbolKey).toBeDefined();
    expect(symbolKey?.symbol).toBe('A');
    expect(symbolKey?.keyCapId).toBe('KeyA');
    expect(symbolKey?.shift).toBe(true);
  });

  it('should return the correct SymbolKey for a symbol character', () => {
    const symbolKey = getSymbolKeyForChar('!');
    expect(symbolKey).toBeDefined();
    expect(symbolKey?.symbol).toBe('!');
    expect(symbolKey?.keyCapId).toBe('Digit1');
    expect(symbolKey?.shift).toBe(true);
  });

  it('should return the correct SymbolKey for a space character', () => {
    const symbolKey = getSymbolKeyForChar(' ');
    expect(symbolKey).toBeDefined();
    expect(symbolKey?.symbol).toBe(' ');
    expect(symbolKey?.keyCapId).toBe('Space');
    expect(symbolKey?.shift).toBe(false);
  });

  it('should return undefined for a character not in the layout', () => {
    const symbolKey = getSymbolKeyForChar('€');
    expect(symbolKey).toBeUndefined();
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
