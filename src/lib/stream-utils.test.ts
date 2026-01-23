import { describe, expect,it } from "vitest";

import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en"; // Corrected import path
import { KeyCapId, StreamSymbol } from "@/interfaces/types";

import { addAttempt, createTypingStream, getSymbolChar,getSymbolType } from "./stream-utils";
import { getKeyCapIdsForChar, nbsp } from "./symbol-utils";


describe("createTypingStream", () => {
  it("should create a TypingStream from a string", () => {
    const text = "hello";
    const stream = createTypingStream(text, symbolLayoutEnQwerty);

    expect(stream).toHaveLength(5);
    expect(stream[0].targetSymbol).toBe("h");
    expect(stream[4].targetSymbol).toBe("o");
  });

  it("should handle an empty string", () => {
    const text = "";
    const stream = createTypingStream(text, symbolLayoutEnQwerty);
    expect(stream).toHaveLength(0);
  });

  it("should correctly handle spaces", () => {
    const text = "a b";
    const stream = createTypingStream(text, symbolLayoutEnQwerty);
    expect(stream).toHaveLength(3);
    expect(stream[1].targetSymbol).toBe(" ");
  });

  it("should skip characters not in the layout", () => {
    const text = "a你好b"; // Assuming '你好' are not in the layout
    const stream = createTypingStream(text, symbolLayoutEnQwerty);
    expect(stream).toHaveLength(2);
    expect(stream[0].targetSymbol).toBe("a");
    expect(stream[1].targetSymbol).toBe("b");
  });
});

describe("addAttempt", () => {
  const pressedKeyCupsA: KeyCapId[] = ["KeyA"];
  const pressedKeyCupsB: KeyCapId[] = ["KeyB"];

  it("should add an attempt to a symbol", () => {
    const stream = createTypingStream("a", symbolLayoutEnQwerty);
    const newStream = addAttempt({ stream, cursorPosition: 0, pressedKeyCups: pressedKeyCupsA, startAt: 0, endAt: 100 });

    expect(newStream[0].attempts).toHaveLength(1);
    expect(newStream[0].attempts[0].pressedKeyCups).toEqual(pressedKeyCupsA);
  });

  it("should add multiple attempts", () => {
    let stream = createTypingStream("a", symbolLayoutEnQwerty);
    stream = addAttempt({ stream, cursorPosition: 0, pressedKeyCups: pressedKeyCupsB, startAt: 0, endAt: 100 });
    stream = addAttempt({ stream, cursorPosition: 0, pressedKeyCups: pressedKeyCupsA, startAt: 100, endAt: 200 });

    expect(stream[0].attempts).toHaveLength(2);
    expect(stream[0].attempts[1].pressedKeyCups).toEqual(pressedKeyCupsA);
  });

  it("should be immutable", () => {
    const stream = createTypingStream("a", symbolLayoutEnQwerty);
    const newStream = addAttempt({ stream, cursorPosition: 0, pressedKeyCups: pressedKeyCupsA, startAt: 0, endAt: 100 });
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
      attempts: [{ pressedKeyCups: ["KeyA"] }],
    };
    expect(getSymbolType(symbol)).toBe("CORRECT");
  });

  it('should return "ERROR" for an incorrect first attempt', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      targetKeyCaps: ["KeyA"],
      attempts: [{ pressedKeyCups: ["KeyB"] }],
    };
    expect(getSymbolType(symbol)).toBe("ERROR");
  });

  it('should return "CORRECTED" for a correct attempt after an incorrect one', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      targetKeyCaps: ["KeyA"],
      attempts: [
        { pressedKeyCups: ["KeyB"] },
        { pressedKeyCups: ["KeyA"] },
      ],
    };
    expect(getSymbolType(symbol)).toBe("CORRECTED");
  });

  it('should return "INCORRECTS" for multiple incorrect attempts', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      targetKeyCaps: ["KeyA"],
      attempts: [
        { pressedKeyCups: ["KeyB"] },
        { pressedKeyCups: ["KeyC"]},
      ],
    };
    expect(getSymbolType(symbol)).toBe("INCORRECTS");
  });

  // --- Tests for Chord Presses (e.g., Shift + Key) ---

  it('should return "CORRECT" for a correct chord press (e.g., Shift + A)', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "A",
      targetKeyCaps: ["ShiftLeft", "KeyA"],
      attempts: [{ pressedKeyCups: ["ShiftLeft", "KeyA"] }],
    };
    expect(getSymbolType(symbol)).toBe("CORRECT");
  });

  it('should return "ERROR" when a required modifier is missing', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "A",
      targetKeyCaps: ["ShiftLeft", "KeyA"],
      attempts: [{ pressedKeyCups: ["KeyA"] }],
    };
    expect(getSymbolType(symbol)).toBe("ERROR");
  });

  it('should return "ERROR" when the wrong key is pressed with a correct modifier', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "A",
      targetKeyCaps: ["ShiftLeft", "KeyA"],
      attempts: [{ pressedKeyCups: ["ShiftLeft", "KeyB"] }],
    };
    expect(getSymbolType(symbol)).toBe("ERROR");
  });

  it('should return "CORRECTED" for a correct chord press after a failed attempt', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "A",
      targetKeyCaps: ["ShiftLeft", "KeyA"],
      attempts: [
        { pressedKeyCups: ["KeyA"] }, // Incorrect attempt
        { pressedKeyCups: ["ShiftLeft", "KeyA"] }, // Correct attempt
      ],
    };
    expect(getSymbolType(symbol)).toBe("CORRECTED");
  });

  it('should return "CORRECTED" for a correct chord press after a failed attempt with any order of KeyCaps', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "A",
      targetKeyCaps: ["ShiftLeft", "KeyA"],
      attempts: [
        { pressedKeyCups: ["KeyA"] }, // Incorrect attempt
        { pressedKeyCups: ["KeyA", "ShiftLeft"] }, // Correct attempt with different KeyCaps order
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
