import { describe, it, expect } from "vitest";
import { findPath } from "./virtual-layout";
import { keyboardLayoutANSI } from "../data/keyboard-layout-ansi";
import { symbolLayoutEnQwerty } from "../data/symbol-layout-en-qwerty";
import { fingerLayoutASDF } from "../data/finger-layout-asdf";
import { VirtualKey } from "../interfaces/types";

describe("findPath", () => {
  it("should correctly identify HOME, TARGET, and PATH keys for target '5'", () => {
    const options = {
      keyboardLayout: keyboardLayoutANSI,
      symbolLayout: symbolLayoutEnQwerty,
      fingerLayout: fingerLayoutASDF,
      targetSymbol: "5",
    };

    const virtualLayout = findPath(options);

    const getKey = (keyCapId: string): VirtualKey | undefined => {
        for (const row of virtualLayout) {
            const key = row.find(k => k.keyCapId === keyCapId);
            if (key) return key;
        }
        return undefined;
    }

    // Home key
    const homeKey = getKey("KeyF");
    expect(homeKey?.navigationRole).toBe("HOME");

    // Target key
    const targetKey = getKey("Digit5");
    expect(targetKey?.navigationRole).toBe("TARGET");

    // Path keys
    const pathKey1 = getKey("KeyR");
    expect(pathKey1?.navigationRole).toBe("PATH");

    const pathKey2 = getKey("Digit4");
    expect(pathKey2?.navigationRole).toBe("PATH");

    // Other keys for the same finger should be IDLE
    const idleKey = getKey("KeyT");
    expect(idleKey?.navigationRole).toBe("IDLE");
  });
});
