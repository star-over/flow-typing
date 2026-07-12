
import type { HandsSceneFixture } from './types';
export const simple_e_error_simple_d: HandsSceneFixture = {
  input: {
    targetSymbol: "e",
    targetKeyCaps: ["KeyE"],
    attempts: [{ pressedKeyCaps: ["KeyD"], startAt: 1768037382256, endAt: 1768037382256 }]
  },
  expectedOutput: {
    L1: { navigationRole: "INACTIVE" }, L2: { navigationRole: "INACTIVE" },
    L3: {
      navigationRole: "TARGET",
      navigationPath: ["KeyD", "KeyE"],
      keyCapStates: {
        Digit3: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyE: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" },
        KeyD: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "ERROR", navigationArrow: "UP" },
        KeyC: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }
      }
    },
    L4: { navigationRole: "INACTIVE" }, L5: { navigationRole: "INACTIVE" }, LB: { navigationRole: "INACTIVE" },
    R1: { navigationRole: "NONE" }, R2: { navigationRole: "NONE" }, R3: { navigationRole: "NONE" }, R4: { navigationRole: "NONE" }, R5: { navigationRole: "NONE" }, RB: { navigationRole: "NONE" }
  },
};
