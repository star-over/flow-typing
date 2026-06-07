
import type { HandsSceneFixture } from './types';
export const simple_r_error_simple_f: HandsSceneFixture = {
  input: {
    targetSymbol: "r",
    targetKeyCaps: ["KeyR"],
    attempts: [{ pressedKeyCaps: ["KeyF"], startAt: 1767971157516, endAt: 1767971157516 },]
  },
  expectedOutput: {
    L1: { navigationRole: "INACTIVE" },
    L2: {
      navigationRole: "TARGET",
      keyCapStates: {
        Digit4: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        Digit5: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyR: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" },
        KeyT: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyF: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "ERROR", navigationArrow: "UP" },
        KeyG: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyV: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyB: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }
      }
    },
    L3: { navigationRole: "INACTIVE" }, L4: { navigationRole: "INACTIVE" }, L5: { navigationRole: "INACTIVE" }, LB: { navigationRole: "INACTIVE" },
    R1: { navigationRole: "NONE" }, R2: { navigationRole: "NONE" }, R3: { navigationRole: "NONE" }, R4: { navigationRole: "NONE" }, R5: { navigationRole: "NONE" }, RB: { navigationRole: "NONE" }
  },
};
