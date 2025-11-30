import { describe, it, expect } from "vitest";
import { createTypingStream, addAttempt, getSymbolType, getSymbolChar, nbsp } from "./stream-utils";
import { StreamSymbol, SymbolKey, TypedKey } from "@/interfaces/types";
import { getSymbolKeyForChar } from "./symbol-utils";


describe("createTypingStream", () => {
  it("should create a TypingStream from a string", () => {
    const text = "hello";
    const stream = createTypingStream(text);

    expect(stream).toHaveLength(5);
    expect(stream[0].targetSymbol.symbol).toBe("h");
    expect(stream[4].targetSymbol.symbol).toBe("o");
  });

  it("should handle an empty string", () => {
    const text = "";
    const stream = createTypingStream(text);
    expect(stream).toHaveLength(0);
  });

  it("should correctly handle spaces", () => {
    const text = "a b";
    const stream = createTypingStream(text);
    expect(stream).toHaveLength(3);
    expect(stream[1].targetSymbol.symbol).toBe(" ");
  });

  it("should skip characters not in the layout", () => {
    const text = "a你好b"; // Assuming '你好' are not in the layout
    const stream = createTypingStream(text);
    expect(stream).toHaveLength(2);
    expect(stream[0].targetSymbol.symbol).toBe("a");
    expect(stream[1].targetSymbol.symbol).toBe("b");
  });
});

describe("addAttempt", () => {
  const typedKeyA: TypedKey = { keyCapId: getSymbolKeyForChar("a")!.keyCapId, shift: false };
  const typedKeyB: TypedKey = { keyCapId: getSymbolKeyForChar("b")!.keyCapId, shift: false };

  it("should add an attempt to a symbol", () => {
    const stream = createTypingStream("a");
    const newStream = addAttempt({ stream, cursorPosition: 0, typedKey: typedKeyA, startAt: 0, endAt: 100 });

    expect(newStream[0].attempts).toHaveLength(1);
    expect(newStream[0].attempts[0].typedKey).toEqual(typedKeyA);
  });

  it("should add multiple attempts", () => {
    let stream = createTypingStream("a");
    stream = addAttempt({ stream, cursorPosition: 0, typedKey: typedKeyB, startAt: 0, endAt: 100 });
    stream = addAttempt({ stream, cursorPosition: 0, typedKey: typedKeyA, startAt: 100, endAt: 200 });

    expect(stream[0].attempts).toHaveLength(2);
    expect(stream[0].attempts[1].typedKey).toEqual(typedKeyA);
  });

  it("should be immutable", () => {
    const stream = createTypingStream("a");
    const newStream = addAttempt({ stream, cursorPosition: 0, typedKey: typedKeyA, startAt: 0, endAt: 100 });
    expect(newStream).not.toBe(stream);
    expect(newStream[0]).not.toBe(stream[0]);
  });
});

describe("getSymbolType", () => {
  const targetSymbolA_lower = getSymbolKeyForChar("a")!;
  const targetSymbolA_upper = getSymbolKeyForChar("A")!;
  const targetSymbolB = getSymbolKeyForChar("b")!;

  const typedKeyA_lower: TypedKey = { keyCapId: targetSymbolA_lower.keyCapId, shift: targetSymbolA_lower.shift };
  const typedKeyA_upper: TypedKey = { keyCapId: targetSymbolA_upper.keyCapId, shift: targetSymbolA_upper.shift };
  const typedKeyB: TypedKey = { keyCapId: targetSymbolB.keyCapId, shift: targetSymbolB.shift };


  it('should return "PENDING" for a symbol with an empty attempts array', () => {
    const symbol: StreamSymbol = { targetSymbol: targetSymbolA_lower, attempts: [] };
    expect(getSymbolType(symbol)).toBe("PENDING");
  });

  it('should return "CORRECT" for a correct first attempt', () => {
    const symbol: StreamSymbol = {
      targetSymbol: targetSymbolA_lower,
      attempts: [{ typedKey: typedKeyA_lower, startAt: 0, endAt: 1 }],
    };
    expect(getSymbolType(symbol)).toBe("CORRECT");
  });

  it('should return "INCORRECT" for an incorrect first attempt (wrong key)', () => {
    const symbol: StreamSymbol = {
      targetSymbol: targetSymbolA_lower,
      attempts: [{ typedKey: typedKeyB, startAt: 0, endAt: 1 }],
    };
    expect(getSymbolType(symbol)).toBe("INCORRECT");
  });

  it('should return "INCORRECT" for an incorrect first attempt (wrong shift)', () => {
    const symbol: StreamSymbol = {
      targetSymbol: targetSymbolA_lower, // 'a', shift: false
      attempts: [{ typedKey: typedKeyA_upper, startAt: 0, endAt: 1 }], // same keyCapId, but shift: true
    };
    expect(getSymbolType(symbol)).toBe("INCORRECT");
  });

  it('should return "CORRECTED" for a correct attempt after an incorrect one', () => {
    const symbol: StreamSymbol = {
      targetSymbol: targetSymbolA_lower,
      attempts: [
        { typedKey: typedKeyB, startAt: 0, endAt: 1 },
        { typedKey: typedKeyA_lower, startAt: 1, endAt: 2 },
      ],
    };
    expect(getSymbolType(symbol)).toBe("CORRECTED");
  });

  it('should return "INCORRECTS" for multiple incorrect attempts', () => {
    const symbol: StreamSymbol = {
      targetSymbol: targetSymbolA_lower,
      attempts: [
        { typedKey: typedKeyB, startAt: 0, endAt: 1 },
        { typedKey: typedKeyA_upper, startAt: 1, endAt: 2 }, // still incorrect because of shift
      ],
    };
    expect(getSymbolType(symbol)).toBe("INCORRECTS");
  });

  it('should be case-sensitive and return "INCORRECT" (target A, typed a)', () => {
    const symbol: StreamSymbol = {
      targetSymbol: targetSymbolA_upper, // 'A', shift: true
      attempts: [{ typedKey: typedKeyA_lower, startAt: 0, endAt: 1 }], // 'a', shift: false
    };
    expect(getSymbolType(symbol)).toBe("INCORRECT");
  });
});

describe("getSymbolChar", () => {
  it("should return the target symbol for a regular character", () => {
    const streamSymbol: StreamSymbol = { targetSymbol: getSymbolKeyForChar('a')!, attempts: [] };
    expect(getSymbolChar(streamSymbol)).toBe("a");
  });

  it("should return a non-breaking space for a space character", () => {
    const streamSymbol: StreamSymbol = { targetSymbol: getSymbolKeyForChar(' ')!, attempts: [] };
    expect(getSymbolChar(streamSymbol)).toBe(nbsp);
  });

  it("should return a non-breaking space for an undefined symbol", () => {
    expect(getSymbolChar(undefined)).toBe(nbsp);
  });
});
