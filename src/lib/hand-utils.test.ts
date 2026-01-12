import { describe, expect,it } from "vitest";

import { fingerLayoutASDF } from "../data/finger-layout-asdf";
import { FingerLayout, HandStates, KeyCapId, SymbolLayout } from "../interfaces/types";
import { getFingerKeys, getHomeKeyForFinger, isLeftHandFinger, isRightHandFinger } from "./hand-utils";

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
