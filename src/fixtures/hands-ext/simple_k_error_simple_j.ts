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
    L1: { fingerState: "NONE" }, L2: { fingerState: "NONE" }, L3: { fingerState: "NONE" }, L4: { fingerState: "NONE" }, L5: { fingerState: "NONE" }, LB: { fingerState: "NONE" },
    R1: { fingerState: "INACTIVE" }, R2: { fingerState: "ERROR" },
    R3: {
      fingerState: "TARGET",
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
