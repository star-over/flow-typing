import { HandsExtFixture } from './types';

export const simple_k: HandsExtFixture = {
  input: {
    targetSymbol: 'k',
    targetKeyCaps: ['KeyK'],
    attempts: [],
  },
  expectedOutput: {
    L1: { fingerState: 'NONE' }, L2: { fingerState: 'NONE' }, L3: { fingerState: 'NONE' }, L4: { fingerState: 'NONE' }, L5: { fingerState: 'NONE' }, LB: { fingerState: 'NONE' },
    R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" },
    R3: {
      fingerState: "TARGET",
      keyCapStates: {
        Digit8: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" },
        KeyI: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" },
        KeyK: { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NONE" },
        Comma: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" }
      }
    },
    R4: { fingerState: "INACTIVE" }, R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" },
  }
};
