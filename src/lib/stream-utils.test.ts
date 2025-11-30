import { describe, it, expect } from "vitest";
import { createTypingStream, addAttempt, getSymbolType, getSymbolChar, nbsp } from "./stream-utils";
import { StreamSymbol } from "@/interfaces/types";

describe("createTypingStream", () => {
  it("should create a TypingStream from a string", () => {
    const text = "hello";
    const stream = createTypingStream(text);

    expect(stream).toHaveLength(5);
    expect(stream[0]).toEqual({ targetSymbol: "h", attempts: [] });
    expect(stream[1]).toEqual({ targetSymbol: "e", attempts: [] });
    expect(stream[2]).toEqual({ targetSymbol: "l", attempts: [] });
    expect(stream[3]).toEqual({ targetSymbol: "l", attempts: [] });
    expect(stream[4]).toEqual({ targetSymbol: "o", attempts: [] });
  });

  it("should handle an empty string", () => {
    const text = "";
    const stream = createTypingStream(text);

    expect(stream).toHaveLength(0);
  });

  it("should handle a string with spaces", () => {
    const text = "a b";
    const stream = createTypingStream(text);

    expect(stream).toHaveLength(3);
    expect(stream[1]).toEqual({ targetSymbol: " ", attempts: [] });
  });

  it("should handle a string with special characters", () => {
    const text = "!@#$%";
    const stream = createTypingStream(text);

    expect(stream).toHaveLength(5);
    expect(stream[0]).toEqual({ targetSymbol: "!", attempts: [] });
    expect(stream[4]).toEqual({ targetSymbol: "%", attempts: [] });
  });

  it("should handle a string with unicode characters", () => {
    const text = "你好";
    const stream = createTypingStream(text);

    expect(stream).toHaveLength(2);
    expect(stream[0]).toEqual({ targetSymbol: "你", attempts: [] });
    expect(stream[1]).toEqual({ targetSymbol: "好", attempts: [] });
  });
});

describe("addAttempt", () => {
  it("should add an attempt to a symbol with no previous attempts", () => {
    const stream = createTypingStream("a");
    const newStream = addAttempt({ stream, cursorPosition: 0, typedSymbol: "a", startAt: 0, endAt: 100 });

    expect(newStream[0].attempts).toBeDefined();
    expect(newStream[0].attempts).toHaveLength(1);
    expect(newStream[0].attempts?.[0]).toEqual({ typedSymbol: "a", startAt: 0, endAt: 100 });
  });

  it("should add an attempt to a symbol with existing attempts", () => {
    let stream = createTypingStream("a");
    stream = addAttempt({ stream, cursorPosition: 0, typedSymbol: "b", startAt: 0, endAt: 100 }); // First attempt
    stream = addAttempt({ stream, cursorPosition: 0, typedSymbol: "a", startAt: 100, endAt: 200 }); // Second attempt

    expect(stream[0].attempts).toHaveLength(2);
    expect(stream[0].attempts?.[1]).toEqual({ typedSymbol: "a", startAt: 100, endAt: 200 });
  });

  it("should not modify the stream if cursorPosition is out of bounds", () => {
    const stream = createTypingStream("a");
    const newStream = addAttempt({ stream, cursorPosition: 1, typedSymbol: "a", startAt: 0, endAt: 100 });

    expect(newStream).toBe(stream); // Should return the original stream instance
  });

  it("should not modify the stream if cursorPosition is negative", () => {
    const stream = createTypingStream("a");
    const newStream = addAttempt({ stream, cursorPosition: -1, typedSymbol: "a", startAt: 0, endAt: 100 });

    expect(newStream).toBe(stream); // Should return the original stream instance
  });

  it("should be immutable", () => {
    const stream = createTypingStream("a");
    const newStream = addAttempt({ stream, cursorPosition: 0, typedSymbol: "a", startAt: 0, endAt: 100 });

    expect(newStream).not.toBe(stream);
    expect(newStream[0]).not.toBe(stream[0]);
  });
});

describe("getSymbolType", () => {
  it('should return "PENDING" for a symbol with an empty attempts array', () => {
    const symbol: StreamSymbol = { targetSymbol: "a", attempts: [] };
    expect(getSymbolType(symbol)).toBe("PENDING");
  });

  it('should return "CORRECT" for a correct first attempt', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      attempts: [{ typedSymbol: "a", startAt: 0, endAt: 1 }],
    };
    expect(getSymbolType(symbol)).toBe("CORRECT");
  });

  it('should return "INCORRECT" for an incorrect first attempt', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      attempts: [{ typedSymbol: "b", startAt: 0, endAt: 1 }],
    };
    expect(getSymbolType(symbol)).toBe("INCORRECT");
  });

  it('should return "CORRECTED" for a correct attempt after incorrect ones', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      attempts: [
        { typedSymbol: "b", startAt: 0, endAt: 1 },
        { typedSymbol: "a", startAt: 1, endAt: 2 },
      ],
    };
    expect(getSymbolType(symbol)).toBe("CORRECTED");
  });

  it('should return "INCORRECTS" for multiple incorrect attempts', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      attempts: [
        { typedSymbol: "b", startAt: 0, endAt: 1 },
        { typedSymbol: "c", startAt: 1, endAt: 2 },
      ],
    };
    expect(getSymbolType(symbol)).toBe("INCORRECTS");
  });

  it('should return "CORRECTED" for a correct attempt after incorrect multiple', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      attempts: [
        { typedSymbol: "b", startAt: 0, endAt: 1 },
        { typedSymbol: "c", startAt: 1, endAt: 2 },
        { typedSymbol: "a", startAt: 2, endAt: 3 },
      ],
    };
    expect(getSymbolType(symbol)).toBe("CORRECTED");
  });

  it('should be case-sensitive and return "INCORRECT"', () => {
    const symbol: StreamSymbol = {
      targetSymbol: "a",
      attempts: [{ typedSymbol: "A", startAt: 0, endAt: 1 }],
    };
    expect(getSymbolType(symbol)).toBe("INCORRECT");
  });
});

describe("getSymbolChar", () => {
  it("should return the target symbol for a regular character", () => {
    const symbol = { targetSymbol: "a" };
    expect(getSymbolChar(symbol)).toBe("a");
  });

  it("should return a non-breaking space for a space character", () => {
    const symbol = { targetSymbol: " " };
    expect(getSymbolChar(symbol)).toBe(nbsp);
  });

  it("should return a non-breaking space for an empty target symbol", () => {
    const symbol = { targetSymbol: "" };
    expect(getSymbolChar(symbol)).toBe(nbsp);
  });
});
