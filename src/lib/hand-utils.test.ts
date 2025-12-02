import { describe, it, expect } from "vitest";
import { getHandStates } from "./hand-utils";
import { symbolLayoutEnQwerty } from "../data/symbol-layout-en-qwerty";
import { fingerLayoutASDF } from "../data/finger-layout-asdf";
import { SymbolKey, SymbolLayout, FingerLayout, HandStates } from "../interfaces/types";

describe("getHandStates", () => {
  const symbolLayout: SymbolLayout = symbolLayoutEnQwerty;
  const fingerLayout: FingerLayout = fingerLayoutASDF;

  const idleHands: HandStates = {
    L1: "IDLE", L2: "IDLE", L3: "IDLE", L4: "IDLE", L5: "IDLE", LB: "IDLE",
    R1: "IDLE", R2: "IDLE", R3: "IDLE", R4: "IDLE", R5: "IDLE", RB: "IDLE",
  };

  it("should return all IDLE when targetSymbol is undefined", () => {
    const handStates = getHandStates(undefined, symbolLayout, fingerLayout);
    expect(handStates).toEqual(idleHands);
  });

  it("should return all IDLE for a symbol not in the layout", () => {
    const unknownSymbol: SymbolKey = { keyCapId: "Unknown", symbol: "€", shift: false };
    const handStates = getHandStates(unknownSymbol, symbolLayout, fingerLayout);
    expect(handStates).toEqual(idleHands);
  });

  it("should activate L3 for 'e' and set the rest of the left hand to INACTIVE", () => {
    const targetSymbol = symbolLayout.find((k) => k.symbol === "e");
    const handStates = getHandStates(targetSymbol, symbolLayout, fingerLayout);

    expect(handStates.L3).toBe("ACTIVE");
    expect(handStates.L1).toBe("INACTIVE");
    expect(handStates.L2).toBe("INACTIVE");
    expect(handStates.L4).toBe("INACTIVE");
    expect(handStates.L5).toBe("INACTIVE");
    expect(handStates.LB).toBe("INACTIVE");
    
    // Right hand should be IDLE
    expect(handStates.R1).toBe("IDLE");
    expect(handStates.R2).toBe("IDLE");
    expect(handStates.R3).toBe("IDLE");
    expect(handStates.R4).toBe("IDLE");
    expect(handStates.R5).toBe("IDLE");
    expect(handStates.RB).toBe("IDLE");
  });

  it("should activate R3 for 'i' and set the rest of the right hand to INACTIVE", () => {
    const targetSymbol = symbolLayout.find((k) => k.symbol === "i");
    const handStates = getHandStates(targetSymbol, symbolLayout, fingerLayout);

    expect(handStates.R3).toBe("ACTIVE");
    expect(handStates.R1).toBe("INACTIVE");
    expect(handStates.R2).toBe("INACTIVE");
    expect(handStates.R4).toBe("INACTIVE");
    expect(handStates.R5).toBe("INACTIVE");
    expect(handStates.RB).toBe("INACTIVE");

    // Left hand should be IDLE
    expect(handStates.L1).toBe("IDLE");
    expect(handStates.L2).toBe("IDLE");
    expect(handStates.L3).toBe("IDLE");
    expect(handStates.L4).toBe("IDLE");
    expect(handStates.L5).toBe("IDLE");
    expect(handStates.LB).toBe("IDLE");
  });

  it("should return all IDLE for a symbol with no finger mapping", () => {
    // Use a symbol that exists in symbolLayout but remove its finger mapping
    const mockFingerLayout: FingerLayout = fingerLayout.filter(
      (key) => key.keyCapId !== "Backquote"
    );

    const targetSymbol = symbolLayout.find((k) => k.keyCapId === "Backquote" && !k.shift);
    const handStates = getHandStates(targetSymbol, symbolLayout, mockFingerLayout);
    expect(handStates).toEqual(idleHands);
  });

  it("should activate L3 for shifted 'E' and ignore shift key (for now)", () => {
    const targetSymbol = symbolLayout.find((k) => k.symbol === "E" && k.shift);
    const handStates = getHandStates(targetSymbol, symbolLayout, fingerLayout);

    expect(handStates.L3).toBe("ACTIVE");
    // The rest of the left hand should be INACTIVE
    expect(handStates.L1).toBe("INACTIVE");
    expect(handStates.L2).toBe("INACTIVE");
    expect(handStates.L4).toBe("INACTIVE");
    expect(handStates.L5).toBe("INACTIVE");
    // Per current logic, R5 (shift) is not activated
    expect(handStates.R5).toBe("IDLE");
  });
});
