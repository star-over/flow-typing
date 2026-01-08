import { describe, expect,it } from "vitest";

import { fingerLayoutASDF } from "../data/finger-layout-asdf";
import { symbolLayoutEnQwerty } from "../data/symbol-layout-en-qwerty";
import { FingerLayout, HandStates, SymbolLayout, TypedKey } from "../interfaces/types";
import { getFingerKeys,getHandStates, getHomeKeyForFinger, isLeftHandFinger, isRightHandFinger } from "./hand-utils";

describe("getHandStates", () => {
  const fingerLayout: FingerLayout = fingerLayoutASDF;

  const idleHands: HandStates = {
    L1: "IDLE", L2: "IDLE", L3: "IDLE", L4: "IDLE", L5: "IDLE", LB: "IDLE",
    R1: "IDLE", R2: "IDLE", R3: "IDLE", R4: "IDLE", R5: "IDLE", RB: "IDLE",
  };

  it("should return all IDLE when targetSymbol is undefined", () => {
    const handStates = getHandStates(undefined, undefined, fingerLayout);
    expect(handStates).toEqual(idleHands);
  });

  it("should return all IDLE for a symbol not in the layout", () => {
    const handStates = getHandStates("€", undefined, fingerLayout);
    expect(handStates).toEqual(idleHands);
  });

  it("should activate L3 for 'e' and set the rest of the left hand to INACTIVE", () => {
    const handStates = getHandStates("e", undefined, fingerLayout);

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
    const handStates = getHandStates("i", undefined, fingerLayout);

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
    const mockFingerLayout = { ...fingerLayout };
    delete mockFingerLayout.Backquote;

    const handStates = getHandStates("`", undefined, mockFingerLayout);
    expect(handStates).toEqual(idleHands);
  });

  it("should activate L3 for 'E' and R5 for shift", () => {
    const handStates = getHandStates("E", undefined, fingerLayout);

    expect(handStates.L3).toBe("ACTIVE"); // 'e' key
    expect(handStates.R5).toBe("ACTIVE"); // opposite pinky for shift

    // The rest of the left hand should be INACTIVE
    expect(handStates.L1).toBe("INACTIVE");
    expect(handStates.L2).toBe("INACTIVE");
    expect(handStates.L4).toBe("INACTIVE");
    expect(handStates.L5).toBe("INACTIVE");

    // The rest of the right hand should be IDLE
    expect(handStates.R1).toBe("IDLE");
    expect(handStates.R2).toBe("IDLE");
    expect(handStates.R3).toBe("IDLE");
    expect(handStates.R4).toBe("IDLE");
  });

  // Error indication tests
  describe("error indication", () => {
    it("should not change algorithm when error is made by the same finger", () => {
      const targetSymbol = "e"; // L3 finger
      const typedKey: TypedKey = { keyCapId: "KeyD", shift: false, isCorrect: false }; // Also L3 finger

      const handStates = getHandStates(targetSymbol, typedKey, fingerLayout);

      // Should only show the target finger as ACTIVE
      expect(handStates.L3).toBe("ACTIVE");
      // Other fingers on the same hand should be INACTIVE
      expect(handStates.L1).toBe("INACTIVE");
      expect(handStates.L2).toBe("INACTIVE");
      expect(handStates.L4).toBe("INACTIVE");
      expect(handStates.L5).toBe("INACTIVE");
      expect(handStates.LB).toBe("INACTIVE");
    });

    it("should mark erroneous finger as INCORRECT when error is made by different finger but same hand", () => {
      const targetSymbol = "e"; // L3 finger
      const typedKey: TypedKey = { keyCapId: "KeyS", shift: false, isCorrect: false }; // L4 finger (same hand)

      const handStates = getHandStates(targetSymbol, typedKey, fingerLayout);

      // Target finger should be ACTIVE
      expect(handStates.L3).toBe("ACTIVE");
      // Erroneous finger should be INCORRECT
      expect(handStates.L4).toBe("INCORRECT");
      // Other fingers should be INACTIVE
      expect(handStates.L1).toBe("INACTIVE");
      expect(handStates.L2).toBe("INACTIVE");
      expect(handStates.L5).toBe("INACTIVE");
      expect(handStates.LB).toBe("INACTIVE");
    });

    it("should mark entire erroneous hand as INCORRECT when error is made by different hand", () => {
      const targetSymbol = "e"; // L3 finger
      const typedKey: TypedKey = { keyCapId: "KeyI", shift: false, isCorrect: false }; // R3 finger (different hand)

      const handStates = getHandStates(targetSymbol, typedKey, fingerLayout);

      // Target finger should be ACTIVE
      expect(handStates.L3).toBe("ACTIVE");
      // All fingers on the erroneous hand should be INCORRECT
      expect(handStates.R1).toBe("INCORRECT");
      expect(handStates.R2).toBe("INCORRECT");
      expect(handStates.R3).toBe("INCORRECT");
      expect(handStates.R4).toBe("INCORRECT");
      expect(handStates.R5).toBe("INCORRECT");
      expect(handStates.RB).toBe("INCORRECT");
      // Other fingers on the correct hand should be INACTIVE
      expect(handStates.L1).toBe("INACTIVE");
      expect(handStates.L2).toBe("INACTIVE");
      expect(handStates.L4).toBe("INACTIVE");
      expect(handStates.L5).toBe("INACTIVE");
      expect(handStates.LB).toBe("INACTIVE");
    });
  });
});

describe("getHomeKeyForFinger", () => {
  it("should return the correct home key for a given finger", () => {
    expect(getHomeKeyForFinger("L5", fingerLayoutASDF)).toBe("KeyA");
    expect(getHomeKeyForFinger("L4", fingerLayoutASDF)).toBe("KeyS");
    expect(getHomeKeyForFinger("R2", fingerLayoutASDF)).toBe("KeyJ");
    expect(getHomeKeyForFinger("R5", fingerLayoutASDF)).toBe("Semicolon");
  });

  it("should return the correct home key for thumbs", () => {
    expect(getHomeKeyForFinger("L1", fingerLayoutASDF)).toBeUndefined();
    expect(getHomeKeyForFinger("R1", fingerLayoutASDF)).toBe("Space");
  });

  it("should return undefined for fingers with no home key", () => {
    // Assuming LB and RB don't have home keys
    expect(getHomeKeyForFinger("LB", fingerLayoutASDF)).toBeUndefined();
    expect(getHomeKeyForFinger("RB", fingerLayoutASDF)).toBeUndefined();
  });
});

describe("isLeftHandFinger", () => {
  it("should return true for left hand fingers", () => {
    expect(isLeftHandFinger("L1")).toBe(true);
    expect(isLeftHandFinger("L2")).toBe(true);
    expect(isLeftHandFinger("L3")).toBe(true);
    expect(isLeftHandFinger("L4")).toBe(true);
    expect(isLeftHandFinger("L5")).toBe(true);
    expect(isLeftHandFinger("LB")).toBe(true);
  });

  it("should return false for right hand fingers", () => {
    expect(isLeftHandFinger("R1")).toBe(false);
    expect(isLeftHandFinger("R2")).toBe(false);
    expect(isLeftHandFinger("R3")).toBe(false);
    expect(isLeftHandFinger("R4")).toBe(false);
    expect(isLeftHandFinger("R5")).toBe(false);
    expect(isLeftHandFinger("RB")).toBe(false);
  });
});

describe("isRightHandFinger", () => {
  it("should return true for right hand fingers", () => {
    expect(isRightHandFinger("R1")).toBe(true);
    expect(isRightHandFinger("R2")).toBe(true);
    expect(isRightHandFinger("R3")).toBe(true);
    expect(isRightHandFinger("R4")).toBe(true);
    expect(isRightHandFinger("R5")).toBe(true);
    expect(isRightHandFinger("RB")).toBe(true);
  });

  it("should return false for left hand fingers", () => {
    expect(isRightHandFinger("L1")).toBe(false);
    expect(isRightHandFinger("L2")).toBe(false);
    expect(isRightHandFinger("L3")).toBe(false);
    expect(isRightHandFinger("L4")).toBe(false);
    expect(isRightHandFinger("L5")).toBe(false);
    expect(isRightHandFinger("LB")).toBe(false);
  });
});

describe('getFingerKeys', () => {
  it('should return all keyCapIds for L2 (index finger left hand)', () => {
    const keys = getFingerKeys('L2', fingerLayoutASDF);
    expect(keys).toEqual(expect.arrayContaining(['Digit4', 'Digit5', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB']));
    expect(keys).toHaveLength(8);
  });

  it('should return all keyCapIds for R1 (thumb right hand)', () => {
    const keys = getFingerKeys('R1', fingerLayoutASDF);
    expect(keys).toEqual(expect.arrayContaining(['Space']));
    expect(keys).toHaveLength(1);
  });

  it('should return an empty array for a finger with no assigned keys in fingerLayoutASDF', () => {
    // В fingerLayoutASDF для LB и RB нет назначенных клавиш.
    const lbCluster = getFingerKeys('LB', fingerLayoutASDF);
    expect(lbCluster).toEqual([]);
    const rbCluster = getFingerKeys('RB', fingerLayoutASDF);
    expect(rbCluster).toEqual([]);
  });
});
