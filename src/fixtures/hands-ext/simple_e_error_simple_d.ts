
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
      fingerState: "ACTIVE",
      keyCapStates: {
        Digit3: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyE: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyD: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "INCORRECT", navigationArrow: "UP" },
        KeyC: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }
      }
    },
    L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "IDLE" }, R2: { fingerState: "IDLE" }, R3: { fingerState: "IDLE" }, R4: { fingerState: "IDLE" }, R5: { fingerState: "IDLE" }, RB: { fingerState: "IDLE" }
  },
};
