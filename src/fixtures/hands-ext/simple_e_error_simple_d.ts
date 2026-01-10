
import { HandsExtFixture } from './types';
export const simple_e_error_simple_d: HandsExtFixture = {
  input: {
    targetSymbol: "e",
    targetKeyCaps: ["KeyE"],
    attempts: [{ pressedKeyCups: ["KeyD"], startAt: 1768037382256, endAt: 1768037382256 }]
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" }, L2: { fingerState: "INACTIVE" },
    L3: {
      fingerState: "TARGET",
      keyCapStates: {
        Digit3: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" },
        KeyE: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" },
        KeyD: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "ERROR", navigationArrow: "UP" },
        KeyC: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NONE", navigationArrow: "NONE" }
      }
    },
    L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "NONE" }, R2: { fingerState: "NONE" }, R3: { fingerState: "NONE" }, R4: { fingerState: "NONE" }, R5: { fingerState: "NONE" }, RB: { fingerState: "NONE" }
  },
};
