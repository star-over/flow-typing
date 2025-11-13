import { describe, it, expect } from "vitest";
import { createTypingStream } from "./stream";

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
