import { HandsExtFixture } from './types';

export const simple_k_error_simple_j: HandsExtFixture = {
  input: {
    targetSymbol: 'k',
    targetKeyCaps: ['KeyK'],
    attempts: [
      {
        pressedKeyCups: ['KeyJ'],
        startAt: 0,
        endAt: 0,
      }
    ],
  },
  expectedOutput: {
    L1: { fingerState: "IDLE" }, L2: { fingerState: "IDLE" }, L3: { fingerState: "IDLE" }, L4: { fingerState: "IDLE" }, L5: { fingerState: "IDLE" }, LB: { fingerState: "IDLE" },
    R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INCORRECT" },
    R3: {
      fingerState: "ACTIVE",
      keyCapStates: {
        Digit8: { visibility: "VISIBLE", navigationRole: "NONE",      navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyI:   { visibility: "VISIBLE", navigationRole: "NONE",      navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyK:   { visibility: "VISIBLE", navigationRole: "TARGET",    navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Comma:  { visibility: "VISIBLE", navigationRole: "NONE",      navigationArrow: "NONE", pressResult: "NEUTRAL" }
      }
    },
    R4: { fingerState: "INACTIVE" }, R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" },
  }
};
