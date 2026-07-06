
import type { HandsSceneFixture } from './types';
export const shift_o_error_simple_o: HandsSceneFixture = {
  input: {
    targetSymbol: "O",
    targetKeyCaps: ["KeyO", "ShiftLeft"],
    attempts: [{ pressedKeyCaps: ["KeyO"], startAt: 1768029529467, endAt: 1768029529467 }]
  },
  expectedOutput: {
    L1: { navigationRole: "INACTIVE" }, L2: { navigationRole: "INACTIVE" }, L3: { navigationRole: "INACTIVE" }, L4: { navigationRole: "INACTIVE" },
    L5: {
      navigationRole: "TARGET",
      keyCapStates: {
        Backquote: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        Digit1: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyQ: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyA: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "DOWN" },
        KeyZ: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "LEFT" },
        ShiftLeft: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "ERROR", navigationArrow: "NONE" }
      }
    },
    LB: { navigationRole: "INACTIVE" },
    R1: { navigationRole: "INACTIVE" }, R2: { navigationRole: "INACTIVE" }, R3: { navigationRole: "INACTIVE" },
        R4: {
      navigationRole: "TARGET",
      keyCapStates: {
        Digit9: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyO: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "CORRECT", navigationArrow: "NONE" },
        KeyL: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "UP" },
        Period: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
      }
    },
    R5: { navigationRole: "INACTIVE" }, RB: { navigationRole: "INACTIVE" }
  },
};
