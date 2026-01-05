import { describe, expect,it } from "vitest";

import { StreamSymbol, TypedKey } from "@/interfaces/types";

import { addAttempt, createTypingStream, getSymbolChar,getSymbolType } from "./stream-utils";
import { getKeyCapIdsForChar, nbsp } from "./symbol-utils";


describe("createTypingStream", () => {
  it("should create a TypingStream from a string", () => {
    const text = "hello";
    const stream = createTypingStream(text);

    expect(stream).toHaveLength(5);
    expect(stream[0].targetSymbol).toBe("h");
    expect(stream[4].targetSymbol).toBe("o");
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
    expect(stream[1].targetSymbol).toBe(" ");
  });

  it("should skip characters not in the layout", () => {
    const text = "a你好b"; // Assuming '你好' are not in the layout
    const stream = createTypingStream(text);
    expect(stream).toHaveLength(2);
    expect(stream[0].targetSymbol).toBe("a");
    expect(stream[1].targetSymbol).toBe("b");
  });
});

describe("addAttempt", () => {
  const typedKeyA: TypedKey = { keyCapId: getKeyCapIdsForChar("a")![0], shift: false, isCorrect: true };
  const typedKeyB: TypedKey = { keyCapId: getKeyCapIdsForChar("b")![0], shift: false, isCorrect: false };

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
  const correctTypedKey: TypedKey = { keyCapId: "KeyA", shift: false, isCorrect: true };
  const incorrectTypedKey: TypedKey = { keyCapId: "KeyB", shift: false, isCorrect: false };

  it('should return "PENDING" for a symbol with an empty attempts array', () => {
    const symbol: StreamSymbol = { targetSymbol: "a", requiredKeyCapIds: ['KeyA'], attempts: [] };
    expect(getSymbolType(symbol)).toBe("PENDING");
  });

  it('should return "CORRECT" for a correct first attempt', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      requiredKeyCapIds: ['KeyA'],
      attempts: [{ typedKey: correctTypedKey, startAt: 0, endAt: 1 }],
    };
    expect(getSymbolType(symbol)).toBe("CORRECT");
  });

  it('should return "INCORRECT" for an incorrect first attempt', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      requiredKeyCapIds: ['KeyA'],
      attempts: [{ typedKey: incorrectTypedKey, startAt: 0, endAt: 1 }],
    };
    expect(getSymbolType(symbol)).toBe("INCORRECT");
  });

  it('should return "CORRECTED" for a correct attempt after an incorrect one', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      requiredKeyCapIds: ['KeyA'],
      attempts: [
        { typedKey: incorrectTypedKey, startAt: 0, endAt: 1 },
        { typedKey: correctTypedKey, startAt: 1, endAt: 2 },
      ],
    };
    expect(getSymbolType(symbol)).toBe("CORRECTED");
  });

  it('should return "INCORRECTS" for multiple incorrect attempts', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      requiredKeyCapIds: ['KeyA'],
      attempts: [
        { typedKey: incorrectTypedKey, startAt: 0, endAt: 1 },
        { typedKey: incorrectTypedKey, startAt: 1, endAt: 2 },
      ],
    };
    expect(getSymbolType(symbol)).toBe("INCORRECTS");
  });
});

describe("getSymbolChar", () => {
  it("should return the target symbol for a regular character", () => {
    const streamSymbol: StreamSymbol = { targetSymbol: 'a', requiredKeyCapIds: ['KeyA'], attempts: [] };
    expect(getSymbolChar(streamSymbol)).toBe("a");
  });

  it("should return a non-breaking space for a space character", () => {
    const streamSymbol: StreamSymbol = { targetSymbol: ' ', requiredKeyCapIds: ['SpaceLeft'], attempts: [] };
    expect(getSymbolChar(streamSymbol)).toBe(nbsp);
  });

  it("should return a non-breaking space for an undefined symbol", () => {
    expect(getSymbolChar(undefined)).toBe(nbsp);
  });
});
