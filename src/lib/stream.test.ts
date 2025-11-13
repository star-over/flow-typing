import { describe, it, expect } from "vitest";
import { createTypingStream, addAttempt } from "./stream";

describe("createTypingStream", () => {
  it("should create a TypingStream from a string", () => {
    const text = "hello";
    const stream = createTypingStream(text);

    expect(stream).toHaveLength(5);
    expect(stream[0]).toEqual({ targetSymbol: "h" });
    expect(stream[1]).toEqual({ targetSymbol: "e" });
    expect(stream[2]).toEqual({ targetSymbol: "l" });
    expect(stream[3]).toEqual({ targetSymbol: "l" });
    expect(stream[4]).toEqual({ targetSymbol: "o" });
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
    expect(stream[1]).toEqual({ targetSymbol: " " });
  });
});

describe("addAttempt", () => {
  it("should add an attempt to a symbol with no previous attempts", () => {
    const stream = createTypingStream("a");
    const newStream = addAttempt({ stream, cursorPosition: 0, typedChar: "a", startAt: 0, endAt: 100 });

    expect(newStream[0].attempts).toBeDefined();
    expect(newStream[0].attempts).toHaveLength(1);
    expect(newStream[0].attempts?.[0]).toEqual({ typedChar: "a", startAt: 0, endAt: 100 });
  });

  it("should add an attempt to a symbol with existing attempts", () => {
    let stream = createTypingStream("a");
    stream = addAttempt({ stream, cursorPosition: 0, typedChar: "b", startAt: 0, endAt: 100 }); // First attempt
    stream = addAttempt({ stream, cursorPosition: 0, typedChar: "a", startAt: 100, endAt: 200 }); // Second attempt

    expect(stream[0].attempts).toHaveLength(2);
    expect(stream[0].attempts?.[1]).toEqual({ typedChar: "a", startAt: 100, endAt: 200 });
  });

  it("should not modify the stream if cursorPosition is out of bounds", () => {
    const stream = createTypingStream("a");
    const newStream = addAttempt({ stream, cursorPosition: 1, typedChar: "a", startAt: 0, endAt: 100 });

    expect(newStream).toBe(stream); // Should return the original stream instance
  });

  it("should not modify the stream if cursorPosition is negative", () => {
    const stream = createTypingStream("a");
    const newStream = addAttempt({ stream, cursorPosition: -1, typedChar: "a", startAt: 0, endAt: 100 });

    expect(newStream).toBe(stream); // Should return the original stream instance
  });
});
