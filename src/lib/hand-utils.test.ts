import { describe, expect,it } from "vitest";

import { fingerLayoutASDF } from "../data/finger-layout-asdf";
import { symbolLayoutEnQwerty } from "../data/symbol-layout-en-qwerty";
import { FingerLayout, HandStates, KeyCapId, SymbolLayout } from "../interfaces/types";
import { getFingerKeys,getHandStates, getHomeKeyForFinger, isLeftHandFinger, isRightHandFinger } from "./hand-utils";

describe("getHandStates", () => {
  const fingerLayout: FingerLayout = fingerLayoutASDF;

  const idleHands: HandStates = {
    L1: "NONE",
L2: "NONE",
L3: "NONE",
L4: "NONE",
L5: "NONE",
LB: "NONE",
    R1: "NONE",
R2: "NONE",
R3: "NONE",
R4: "NONE",
R5: "NONE",
RB: "NONE",
  };

  it("should return all NONE when targetSymbol is undefined", () => {
    const handStates = getHandStates(undefined, undefined, false, fingerLayout);
    expect(handStates).toEqual(idleHands);
  });

  it("should return all NONE for a symbol not in the layout", () => {
    const handStates = getHandStates("€", undefined, false, fingerLayout);
    expect(handStates).toEqual(idleHands);
  });

  it("should activate L3 for 'e' and set the rest of the left hand to INACTIVE", () => {
    const handStates = getHandStates("e", undefined, false, fingerLayout);

    expect(handStates.L3).toBe("TARGET");
    expect(handStates.L1).toBe("INACTIVE");
    expect(handStates.L2).toBe("INACTIVE");
    expect(handStates.L4).toBe("INACTIVE");
    expect(handStates.L5).toBe("INACTIVE");
    expect(handStates.LB).toBe("INACTIVE");

    // Right hand should be NONE
    expect(handStates.R1).toBe("NONE");
    expect(handStates.R2).toBe("NONE");
    expect(handStates.R3).toBe("NONE");
    expect(handStates.R4).toBe("NONE");
    expect(handStates.R5).toBe("NONE");
    expect(handStates.RB).toBe("NONE");
  });

  it("should activate R3 for 'i' and set the rest of the right hand to INACTIVE", () => {
    const handStates = getHandStates("i", undefined, false, fingerLayout);

    expect(handStates.R3).toBe("TARGET");
    expect(handStates.R1).toBe("INACTIVE");
    expect(handStates.R2).toBe("INACTIVE");
    expect(handStates.R4).toBe("INACTIVE");
    expect(handStates.R5).toBe("INACTIVE");
    expect(handStates.RB).toBe("INACTIVE");

    // Left hand should be NONE
    expect(handStates.L1).toBe("NONE");
    expect(handStates.L2).toBe("NONE");
    expect(handStates.L3).toBe("NONE");
    expect(handStates.L4).toBe("NONE");
    expect(handStates.L5).toBe("NONE");
    expect(handStates.LB).toBe("NONE");
  });

  it("should return all NONE for a symbol with no finger mapping", () => {
    // Use a symbol that exists in symbolLayout but remove its finger mapping
    const mockFingerLayout = { ...fingerLayout };
    delete mockFingerLayout.Backquote;

    const handStates = getHandStates("`", undefined, false, mockFingerLayout);
    expect(handStates).toEqual(idleHands);
  });

  it("should activate L3 for 'E' and R5 for shift", () => {
    const handStates = getHandStates("E", undefined, false, fingerLayout);

    expect(handStates.L3).toBe("TARGET"); // 'e' key
    expect(handStates.R5).toBe("TARGET"); // opposite pinky for shift

    // The rest of the left hand should be INACTIVE
    expect(handStates.L1).toBe("INACTIVE");
    expect(handStates.L2).toBe("INACTIVE");
    expect(handStates.L4).toBe("INACTIVE");
    expect(handStates.L5).toBe("INACTIVE");

    // The rest of the right hand should be NONE
    expect(handStates.R1).toBe("NONE");
    expect(handStates.R2).toBe("NONE");
    expect(handStates.R3).toBe("NONE");
    expect(handStates.R4).toBe("NONE");
  });

  // Error indication tests
  describe("error indication", () => {
    it("should not change algorithm when error is made by the same finger", () => {
      const targetSymbol = "e"; // L3 finger
      const pressedKeyCups: KeyCapId[] = ["KeyD"]; // Also L3 finger

      const handStates = getHandStates(targetSymbol, pressedKeyCups, true, fingerLayout);

      // Should only show the target finger as ACTIVE
      expect(handStates.L3).toBe("TARGET");
      // Other fingers on the same hand should be INACTIVE
      expect(handStates.L1).toBe("INACTIVE");
      expect(handStates.L2).toBe("INACTIVE");
      expect(handStates.L4).toBe("INACTIVE");
      expect(handStates.L5).toBe("INACTIVE");
      expect(handStates.LB).toBe("INACTIVE");
    });

    it("should mark erroneous finger as INCORRECT when error is made by different finger but same hand", () => {
      const targetSymbol = "e"; // L3 finger
      const pressedKeyCups: KeyCapId[] = ["KeyS"]; // L4 finger (same hand)

      const handStates = getHandStates(targetSymbol, pressedKeyCups, true, fingerLayout);

      // Target finger should be ACTIVE
      expect(handStates.L3).toBe("TARGET");
      // Erroneous finger should be INCORRECT
      expect(handStates.L4).toBe("ERROR");
      // Other fingers should be INACTIVE
      expect(handStates.L1).toBe("INACTIVE");
      expect(handStates.L2).toBe("INACTIVE");
      expect(handStates.L5).toBe("INACTIVE");
      expect(handStates.LB).toBe("INACTIVE");
    });

    it("should mark entire erroneous hand as INCORRECT when error is made by different hand", () => {
      const targetSymbol = "e"; // L3 finger
      const pressedKeyCups: KeyCapId[] = ["KeyI"]; // R3 finger (different hand)

      const handStates = getHandStates(targetSymbol, pressedKeyCups, true, fingerLayout);

      // Target finger should be ACTIVE
      expect(handStates.L3).toBe("TARGET");
      // All fingers on the erroneous hand should be INCORRECT
      expect(handStates.R1).toBe("ERROR");
      expect(handStates.R2).toBe("ERROR");
      expect(handStates.R3).toBe("ERROR");
      expect(handStates.R4).toBe("ERROR");
      expect(handStates.R5).toBe("ERROR");
      expect(handStates.RB).toBe("ERROR");
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
