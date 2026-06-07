
import type { HandsSceneFixture } from './types';
export const shift_o: HandsSceneFixture = {
  input: {
    targetSymbol: "O",
    targetKeyCaps: ["KeyO", "ShiftLeft"],
    attempts: []
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
        Tab: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        CapsLock: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        ShiftLeft: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" },
        ControlLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        MetaLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        AltLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
      }
    },
    LB: { navigationRole: "INACTIVE" }, R1: { navigationRole: "INACTIVE" }, R2: { navigationRole: "INACTIVE" }, R3: { navigationRole: "INACTIVE" },
    R4: {
      navigationRole: "TARGET",
      keyCapStates: {
        Digit9: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyO: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" },
        KeyL: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "UP" },
        Period: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },

      }
    },
    R5: { navigationRole: "INACTIVE" }, RB: { navigationRole: "INACTIVE" }
  },
};
