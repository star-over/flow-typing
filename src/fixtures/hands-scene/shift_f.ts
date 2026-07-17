
import type { HandsSceneFixture } from './types';
export const shift_f: HandsSceneFixture = {
  input: {
    targetSymbol: "F",
    targetKeyCaps: ["KeyF", "ShiftRight"], attempts: []
  },
  expectedOutput: {
    L1: { navigationRole: "INACTIVE" },
    L2: {
      navigationRole: "TARGET",
      navigationPath: ["KeyF"],
      keyCapStates: {
        Digit4: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" },
        Digit5: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" },
        KeyR: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" },
        KeyT: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" },
        KeyF: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE" },
        KeyG: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" },
        KeyV: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" },
        KeyB: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" }
      }
    },
    L3: { navigationRole: "INACTIVE" }, L4: { navigationRole: "INACTIVE" }, L5: { navigationRole: "INACTIVE" }, LB: { navigationRole: "INACTIVE" },
    R1: { navigationRole: "INACTIVE" }, R2: { navigationRole: "INACTIVE" }, R3: { navigationRole: "INACTIVE" }, R4: { navigationRole: "INACTIVE" }, R5: { navigationRole: "TARGET", navigationPath: ["Semicolon", "Slash", "ShiftRight"], keyCapStates: { Digit0: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" }, Minus: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" }, Equal: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" }, KeyP: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" }, BracketLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" }, BracketRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" }, Backslash: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" }, Semicolon: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE" }, Quote: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE" }, Slash: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE" }, ShiftRight: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE" } } }, RB: { navigationRole: "INACTIVE" }
  },
};
