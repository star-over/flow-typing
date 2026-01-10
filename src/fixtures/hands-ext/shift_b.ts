
import { HandsExtFixture } from './types';
export const shift_b: HandsExtFixture = {
  input: {
    targetSymbol: "B",
    targetKeyCaps: ["KeyB", "ShiftRight"], attempts: []
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" },
    L2: {
      fingerState: "TARGET",
      keyCapStates: {
        Digit4: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        Digit5: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyR: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyT: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyF: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "DOWN" },
        KeyG: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyV: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "RIGHT" },
        KeyB: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" }
      }
    },
    L3: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, R5: { fingerState: "TARGET", keyCapStates: { Digit0: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Minus: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Equal: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Backspace: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, KeyP: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, BracketLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, BracketRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Backslash: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Semicolon: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "DOWN" }, Quote: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Enter: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Slash: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "RIGHT" }, ShiftRight: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" }, ControlRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, MetaRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, AltRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, Fn: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }, ContextMenu: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" } } }, RB: { fingerState: "INACTIVE" }
  },
};
