
import { HandsExtFixture } from './types';
export const simple_e_error_shift_F: HandsExtFixture = {
  input: {
    targetSymbol: "e",
    targetKeyCaps: ["KeyE"],
    attempts: [
      { pressedKeyCups: ["ShiftRight", "KeyF"], startAt: 1767985607067, endAt: 1767985607067 }
    ]
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" },
    L2: { fingerState: "ERROR" },
    L3: {
      fingerState: "TARGET",
      keyCapStates: {
        Digit3: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyE: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyD: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "NEUTRAL", navigationArrow: "UP" },
        KeyC: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }
      }
    },
    L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, R5: { fingerState: "ERROR" }, RB: { fingerState: "INACTIVE" }
  },
};
