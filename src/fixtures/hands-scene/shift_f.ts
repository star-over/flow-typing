
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
      keyCapStates: {
        Digit4: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        Digit5: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyR: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyT: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyF: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" },
        KeyG: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyV: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyB: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }
      }
    },
    L3: { navigationRole: "INACTIVE" }, L4: { navigationRole: "INACTIVE" }, L5: { navigationRole: "INACTIVE" }, LB: { navigationRole: "INACTIVE" },
    R1: { navigationRole: "INACTIVE" }, R2: { navigationRole: "INACTIVE" }, R3: { navigationRole: "INACTIVE" }, R4: { navigationRole: "INACTIVE" }, R5: { navigationRole: "TARGET", keyCapStates: { Digit0: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Minus: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Equal: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Backspace: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, KeyP: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, BracketLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, BracketRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Backslash: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Semicolon: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "DOWN" }, Quote: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Enter: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Slash: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "RIGHT" }, ShiftRight: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" }, ControlRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, MetaRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, AltRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Fn: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, ContextMenu: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" } } }, RB: { navigationRole: "INACTIVE" }
  },
};
