
import { HandsExtFixture } from './types';
export const shift_f: HandsExtFixture = {
  input: {
    targetSymbol: "F",
    targetKeyCaps: ["KeyF", "ShiftRight"], attempts: []
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" },
    L2: {
      fingerState: "TARGET",
      keyCapStates: {
        Digit4: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        Digit5: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyR: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyT: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyF: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyG: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyV: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyB: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }
      }
    },
    L3: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, R5: { fingerState: "TARGET", keyCapStates: { Digit0: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, Minus: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, Equal: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, Backspace: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, KeyP: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, BracketLeft: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, BracketRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, Backslash: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, Semicolon: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NEUTRAL", navigationArrow: "DOWN" }, Quote: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, Enter: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, Slash: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NEUTRAL", navigationArrow: "RIGHT" }, ShiftRight: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NEUTRAL", navigationArrow: "NONE" }, ControlRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, MetaRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, AltRight: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, Fn: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }, ContextMenu: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" } } }, RB: { fingerState: "INACTIVE" }
  },
};
