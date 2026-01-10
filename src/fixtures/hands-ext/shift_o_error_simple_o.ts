
import { HandsExtFixture } from './types';
export const shift_o_error_simple_o: HandsExtFixture = {
  input: {
    targetSymbol: "O",
    targetKeyCaps: ["KeyO", "ShiftLeft"],
    attempts: [{ pressedKeyCups: ["KeyO"], startAt: 1768029529467, endAt: 1768029529467 }]
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" }, L2: { fingerState: "INACTIVE" }, L3: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" },
    L5: {
      fingerState: "TARGET",
      keyCapStates: {
        Backquote: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        Digit1: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyQ: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyA: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "DOWN" },
        KeyZ: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "LEFT" },
        Tab: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        CapsLock: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        ShiftLeft: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "ERROR", navigationArrow: "NONE" },
        ControlLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        MetaLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        AltLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }
      }
    },
    LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" },
        R4: {
      fingerState: "TARGET",
      keyCapStates: {
        Digit9: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyO: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "CORRECT", navigationArrow: "NONE" },
        KeyL: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "UP" },
        Period: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
      }
    },
    R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" }
  },
};
