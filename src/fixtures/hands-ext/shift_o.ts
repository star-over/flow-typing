
import { HandsExtFixture } from './types';
export const shift_o: HandsExtFixture = {
  input: {
    targetSymbol: "O",
    targetKeyCaps: ["KeyO", "ShiftLeft"],
    attempts: []
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" }, L2: { fingerState: "INACTIVE" }, L3: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" },
    L5: {
      fingerState: "TARGET",
      keyCapStates: {
        Backquote: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        Digit1: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyQ: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyA: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NEUTRAL", navigationArrow: "DOWN" },
        KeyZ: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NEUTRAL", navigationArrow: "LEFT" },
        Tab: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        CapsLock: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        ShiftLeft: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        ControlLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        MetaLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        AltLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
      }
    },
    LB: { fingerState: "INACTIVE" }, R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" },
    R4: {
      fingerState: "TARGET",
      keyCapStates: {
        Digit9: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyO: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyL: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NEUTRAL", navigationArrow: "UP" },
        Period: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },

      }
    },
    R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" }
  },
};
