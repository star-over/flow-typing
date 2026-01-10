
import { HandsExtFixture } from './types';
export const simple_r_error_simple_f: HandsExtFixture = {
  input: {
    targetSymbol: "r",
    targetKeyCaps: ["KeyR"],
    attempts: [{ pressedKeyCups: ["KeyF"], startAt: 1767971157516, endAt: 1767971157516 },]
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" },
    L2: {
      fingerState: "ACTIVE",
      keyCapStates: {
        Digit4: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        Digit5: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyR: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyT: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyF: { visibility: "VISIBLE", navigationRole: "PATH", pressResult: "INCORRECT", navigationArrow: "UP" },
        KeyG: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyV: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" },
        KeyB: { visibility: "VISIBLE", navigationRole: "NONE", pressResult: "NEUTRAL", navigationArrow: "NONE" }
      }
    },
    L3: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "IDLE" }, R2: { fingerState: "IDLE" }, R3: { fingerState: "IDLE" }, R4: { fingerState: "IDLE" }, R5: { fingerState: "IDLE" }, RB: { fingerState: "IDLE" }
  },
};
