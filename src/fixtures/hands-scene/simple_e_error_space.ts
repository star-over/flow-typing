
import type { HandsSceneFixture } from './types';
export const simple_e_error_space: HandsSceneFixture = {
  input: {
    targetSymbol: "e",
    targetKeyCaps: ["KeyE"],
    attempts: [
      { pressedKeyCaps: ["Space"], startAt: 1767985607067, endAt: 1767985607067 }
    ]
  },
  expectedOutput: {
    L1: { navigationRole: "INACTIVE" }, L2: { navigationRole: "INACTIVE" },
    L3: {
      navigationRole: "TARGET",
      navigationPath: ["KeyD", "KeyE"],
      keyCapStates: {
        Digit3: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyE: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" },
        KeyD: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "UP" },
        KeyC: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }
      }
    },
    L4: { navigationRole: "INACTIVE" }, L5: { navigationRole: "INACTIVE" }, LB: { navigationRole: "INACTIVE" },
    R1: { navigationRole: "ERROR" }, R2: { navigationRole: "INACTIVE" }, R3: { navigationRole: "INACTIVE" }, R4: { navigationRole: "INACTIVE" }, R5: { navigationRole: "INACTIVE" }, RB: { navigationRole: "INACTIVE" }
  },
};
