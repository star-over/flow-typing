
import type { HandsSceneFixture } from './types';
export const shift_t_error_shift_n: HandsSceneFixture = {
  input: {
    targetSymbol: "T",
    targetKeyCaps: ["KeyT", "ShiftRight"],
    attempts: [
      { pressedKeyCaps: ["ShiftLeft", "KeyN"], startAt: 1768032142916, endAt: 1768032142916 }
    ]
  },
  expectedOutput: {
    L1: { navigationRole: "INACTIVE" },
    L2: {
      navigationRole: "TARGET",
      navigationPath: ["KeyF", "KeyR", "KeyT"],
      keyCapStates: {
        Digit4: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        Digit5: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyR: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "RIGHT" },
        KeyT: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" },
        KeyF: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "UP" },
        KeyG: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyV: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyB: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }
      }
    },
    L3: { navigationRole: "INACTIVE" }, L4: { navigationRole: "INACTIVE" }, L5: { navigationRole: "ERROR" }, LB: { navigationRole: "INACTIVE" },
    R1: { navigationRole: "INACTIVE" }, R2: { navigationRole: "ERROR" }, R3: { navigationRole: "INACTIVE" }, R4: { navigationRole: "INACTIVE" },
    R5: {
      navigationRole: "TARGET",
      navigationPath: ["Semicolon", "Slash", "ShiftRight"],
      keyCapStates: {
        Digit0: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        Minus: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        Equal: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyP: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        BracketLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        BracketRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        Backslash: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        Semicolon: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "DOWN" },
        Quote: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        Slash: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "RIGHT" },
        ShiftRight: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" }
      }
    },
    RB: { navigationRole: "INACTIVE" }
  },
};
