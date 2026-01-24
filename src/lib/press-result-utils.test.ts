import { describe, expect, it } from 'vitest';
import { getPressResult } from './press-result-utils';
import { KeyCapPressResult, StreamSymbol } from '@/interfaces/types';

describe('getPressResult', () => {
  it("should return 'NONE' if the stream symbol is undefined", () => {
    expect(getPressResult(undefined)).toBe<KeyCapPressResult>('NONE');
  });

  it("should return 'NONE' if there are no attempts", () => {
    const symbol: StreamSymbol = {
      targetSymbol: 'a',
      targetKeyCaps: ['KeyA'],
      attempts: [],
    };
    expect(getPressResult(symbol)).toBe<KeyCapPressResult>('NONE');
  });

  it("should return 'CORRECT' if the last attempt was correct", () => {
    const symbol: StreamSymbol = {
      targetSymbol: 'a',
      targetKeyCaps: ['KeyA'],
      attempts: [
        { pressedKeyCups: ['KeyB'] }, // incorrect
        { pressedKeyCups: ['KeyA'] }, // correct
      ],
    };
    expect(getPressResult(symbol)).toBe<KeyCapPressResult>('CORRECT');
  });

  it("should return 'ERROR' if the last attempt was incorrect", () => {
    const symbol: StreamSymbol = {
      targetSymbol: 'a',
      targetKeyCaps: ['KeyA'],
      attempts: [
        { pressedKeyCups: ['KeyA'] }, // correct
        { pressedKeyCups: ['KeyB'] }, // incorrect
      ],
    };
    expect(getPressResult(symbol)).toBe<KeyCapPressResult>('ERROR');
  });

  it("should return 'CORRECT' for a correct chord attempt", () => {
    const symbol: StreamSymbol = {
      targetSymbol: 'A',
      targetKeyCaps: ['KeyA', 'ShiftLeft'],
      attempts: [
        { pressedKeyCups: ['KeyA', 'ShiftLeft'] },
      ],
    };
    expect(getPressResult(symbol)).toBe<KeyCapPressResult>('CORRECT');
  });

  it("should return 'ERROR' for an incorrect chord attempt", () => {
    const symbol: StreamSymbol = {
      targetSymbol: 'A',
      targetKeyCaps: ['KeyA', 'ShiftLeft'],
      attempts: [
        { pressedKeyCups: ['KeyA'] }, // Missing shift
      ],
    };
    expect(getPressResult(symbol)).toBe<KeyCapPressResult>('ERROR');
  });
});
