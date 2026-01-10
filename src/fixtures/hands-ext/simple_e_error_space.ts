
import { HandsExtFixture } from './types';
export const simple_e_error_space: HandsExtFixture = {
  input: {
    targetSymbol: "e",
    targetKeyCaps: ["KeyE"],
    attempts: [
      { pressedKeyCups: ["Space"], startAt: 1767985607067, endAt: 1767985607067 }
    ]
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" }, L2: { fingerState: "INACTIVE" },
    L3: {
      fingerState: "TARGET",
      keyCapStates: {
        Digit3: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyE: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" },
        KeyD: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NONE", navigationArrow: "UP" },
        KeyC: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }
      }
    },
    L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "ERROR" }, R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" }
  },
};
