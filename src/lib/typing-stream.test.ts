import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSymbolLayout } from '@/lib/layouts';
import type { KeyCapId, KeyCapPressResult, StreamSymbol } from '@/interfaces/types';
import { addAttempt, createTypingStream, getPressResult, getSymbolChar, getSymbolType, nbsp } from './typing-stream';

const symbolLayoutQwerty = getSymbolLayout('qwerty');

describe('createTypingStream', () => {
  // Символы вне раскладки createTypingStream отбрасывает и пишет console.warn
  // (implementation detail, см. тест ниже). Тесты ниже намеренно подают такие
  // символы — глушим warn, чтобы он не засорял вывод тестов.
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('generates a correct stream for a simple word', () => {
    const stream = createTypingStream({ drillText: 'hi', symbolLayout: symbolLayoutQwerty });

    expect(stream).toHaveLength(2);
    expect(stream[0]).toEqual({ targetSymbol: 'h', targetKeyCaps: ['KeyH'], attempts: [] });
    expect(stream[1]).toEqual({ targetSymbol: 'i', targetKeyCaps: ['KeyI'], attempts: [] });
  });

  it('skips characters not present in the symbol layout', () => {
    // The contract is "skip unknown chars". Whether or not a console.warn
    // is emitted is an implementation detail, not part of the contract.
    const stream = createTypingStream({ drillText: 'a€b', symbolLayout: symbolLayoutQwerty });

    expect(stream).toHaveLength(2);
    expect(stream[0]!.targetSymbol).toBe('a');
    expect(stream[1]!.targetSymbol).toBe('b');
  });

  it('handles an empty string', () => {
    expect(createTypingStream({ drillText: '', symbolLayout: symbolLayoutQwerty })).toHaveLength(0);
  });

  it('keeps the space character as a regular stream symbol', () => {
    const stream = createTypingStream({ drillText: 'a b', symbolLayout: symbolLayoutQwerty });
    expect(stream).toHaveLength(3);
    expect(stream[1]!.targetSymbol).toBe(' ');
  });

  it('skips multi-byte characters not present in the layout (CJK)', () => {
    const stream = createTypingStream({ drillText: 'a你好b', symbolLayout: symbolLayoutQwerty });
    expect(stream).toHaveLength(2);
    expect(stream[0]!.targetSymbol).toBe('a');
    expect(stream[1]!.targetSymbol).toBe('b');
  });
});

describe("addAttempt", () => {
  const pressedKeyCapsA: KeyCapId[] = ["KeyA"];
  const pressedKeyCapsB: KeyCapId[] = ["KeyB"];

  it("should add an attempt to a symbol", () => {
    const stream = createTypingStream({ drillText: "a", symbolLayout: symbolLayoutQwerty });
    const newStream = addAttempt({ stream, cursorPosition: 0, pressedKeyCaps: pressedKeyCapsA, startAt: 0, endAt: 100 });

    expect(newStream[0]!.attempts).toHaveLength(1);
    expect(newStream[0]!.attempts[0]!.pressedKeyCaps).toEqual(pressedKeyCapsA);
  });

  it("should add multiple attempts", () => {
    let stream = createTypingStream({ drillText: "a", symbolLayout: symbolLayoutQwerty });
    stream = addAttempt({ stream, cursorPosition: 0, pressedKeyCaps: pressedKeyCapsB, startAt: 0, endAt: 100 });
    stream = addAttempt({ stream, cursorPosition: 0, pressedKeyCaps: pressedKeyCapsA, startAt: 100, endAt: 200 });

    expect(stream[0]!.attempts).toHaveLength(2);
    expect(stream[0]!.attempts[1]!.pressedKeyCaps).toEqual(pressedKeyCapsA);
  });

  it("should be immutable", () => {
    const stream = createTypingStream({ drillText: "a", symbolLayout: symbolLayoutQwerty });
    const newStream = addAttempt({ stream, cursorPosition: 0, pressedKeyCaps: pressedKeyCapsA, startAt: 0, endAt: 100 });
    expect(newStream).not.toBe(stream);
    expect(newStream[0]).not.toBe(stream[0]);
  });
});

describe("getSymbolType", () => {
  it('should return "PENDING" for a symbol with no attempts', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      targetKeyCaps: ["KeyA"],
      attempts: [],
    };
    expect(getSymbolType(symbol)).toBe("PENDING");
  });

  it('should return "CORRECT" for a correct first attempt', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      targetKeyCaps: ["KeyA"],
      attempts: [{ pressedKeyCaps: ["KeyA"] }],
    };
    expect(getSymbolType(symbol)).toBe("CORRECT");
  });

  it('should return "ERROR" for an incorrect first attempt', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      targetKeyCaps: ["KeyA"],
      attempts: [{ pressedKeyCaps: ["KeyB"] }],
    };
    expect(getSymbolType(symbol)).toBe("ERROR");
  });

  it('should return "CORRECTED" for a correct attempt after an incorrect one', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      targetKeyCaps: ["KeyA"],
      attempts: [
        { pressedKeyCaps: ["KeyB"] },
        { pressedKeyCaps: ["KeyA"] },
      ],
    };
    expect(getSymbolType(symbol)).toBe("CORRECTED");
  });

  it('should return "ERRORS" for multiple incorrect attempts', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      targetKeyCaps: ["KeyA"],
      attempts: [
        { pressedKeyCaps: ["KeyB"] },
        { pressedKeyCaps: ["KeyC"]},
      ],
    };
    expect(getSymbolType(symbol)).toBe("ERRORS");
  });

  // --- Tests for Chord Presses (e.g., Shift + Key) ---

  it('should return "CORRECT" for a correct chord press (e.g., Shift + A)', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "A",
      targetKeyCaps: ["ShiftLeft", "KeyA"],
      attempts: [{ pressedKeyCaps: ["ShiftLeft", "KeyA"] }],
    };
    expect(getSymbolType(symbol)).toBe("CORRECT");
  });

  it('should return "ERROR" when a required modifier is missing', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "A",
      targetKeyCaps: ["ShiftLeft", "KeyA"],
      attempts: [{ pressedKeyCaps: ["KeyA"] }],
    };
    expect(getSymbolType(symbol)).toBe("ERROR");
  });

  it('should return "ERROR" when the wrong key is pressed with a correct modifier', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "A",
      targetKeyCaps: ["ShiftLeft", "KeyA"],
      attempts: [{ pressedKeyCaps: ["ShiftLeft", "KeyB"] }],
    };
    expect(getSymbolType(symbol)).toBe("ERROR");
  });

  it('should return "CORRECTED" for a correct chord press after a failed attempt', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "A",
      targetKeyCaps: ["ShiftLeft", "KeyA"],
      attempts: [
        { pressedKeyCaps: ["KeyA"] }, // Incorrect attempt
        { pressedKeyCaps: ["ShiftLeft", "KeyA"] }, // Correct attempt
      ],
    };
    expect(getSymbolType(symbol)).toBe("CORRECTED");
  });

  it('should return "CORRECTED" for a correct chord press after a failed attempt with any order of KeyCaps', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "A",
      targetKeyCaps: ["ShiftLeft", "KeyA"],
      attempts: [
        { pressedKeyCaps: ["KeyA"] }, // Incorrect attempt
        { pressedKeyCaps: ["KeyA", "ShiftLeft"] }, // Correct attempt with different KeyCaps order
      ],
    };
    expect(getSymbolType(symbol)).toBe("CORRECTED");
  });
});


describe("getSymbolChar", () => {
  it("should return the target symbol for a regular character", () => {
    const streamSymbol: StreamSymbol = { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [] };
    expect(getSymbolChar(streamSymbol)).toBe("a");
  });

  it("should return a non-breaking space for a space character", () => {
    const streamSymbol: StreamSymbol = { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [] };
    expect(getSymbolChar(streamSymbol)).toBe(nbsp);
  });

  it("should return a non-breaking space for an undefined symbol", () => {
    expect(getSymbolChar(undefined)).toBe(nbsp);
  });
});

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
        { pressedKeyCaps: ['KeyB'] }, // incorrect
        { pressedKeyCaps: ['KeyA'] }, // correct
      ],
    };
    expect(getPressResult(symbol)).toBe<KeyCapPressResult>('CORRECT');
  });

  it("should return 'ERROR' if the last attempt was incorrect", () => {
    const symbol: StreamSymbol = {
      targetSymbol: 'a',
      targetKeyCaps: ['KeyA'],
      attempts: [
        { pressedKeyCaps: ['KeyA'] }, // correct
        { pressedKeyCaps: ['KeyB'] }, // incorrect
      ],
    };
    expect(getPressResult(symbol)).toBe<KeyCapPressResult>('ERROR');
  });

  it("should return 'CORRECT' for a correct chord attempt", () => {
    const symbol: StreamSymbol = {
      targetSymbol: 'A',
      targetKeyCaps: ['KeyA', 'ShiftLeft'],
      attempts: [
        { pressedKeyCaps: ['KeyA', 'ShiftLeft'] },
      ],
    };
    expect(getPressResult(symbol)).toBe<KeyCapPressResult>('CORRECT');
  });

  it("should return 'ERROR' for an incorrect chord attempt", () => {
    const symbol: StreamSymbol = {
      targetSymbol: 'A',
      targetKeyCaps: ['KeyA', 'ShiftLeft'],
      attempts: [
        { pressedKeyCaps: ['KeyA'] }, // Missing shift
      ],
    };
    expect(getPressResult(symbol)).toBe<KeyCapPressResult>('ERROR');
  });
});
