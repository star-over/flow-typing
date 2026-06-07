import type { HandsSceneFixture } from './types';

export const simple_k: HandsSceneFixture = {
  input: {
    targetSymbol: 'k',
    targetKeyCaps: ['KeyK'],
    attempts: [],
  },
  expectedOutput: {
    L1: { navigationRole: 'NONE' }, L2: { navigationRole: 'NONE' }, L3: { navigationRole: 'NONE' }, L4: { navigationRole: 'NONE' }, L5: { navigationRole: 'NONE' }, LB: { navigationRole: 'NONE' },
    R1: { navigationRole: "INACTIVE" }, R2: { navigationRole: "INACTIVE" },
    R3: {
      navigationRole: "TARGET",
      keyCapStates: {
        Digit8: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" },
        KeyI: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" },
        KeyK: { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NONE" },
        Comma: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" }
      }
    },
    R4: { navigationRole: "INACTIVE" }, R5: { navigationRole: "INACTIVE" }, RB: { navigationRole: "INACTIVE" },
  }
};
