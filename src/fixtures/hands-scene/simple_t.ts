import type { HandsSceneFixture } from './types';

export const simple_t: HandsSceneFixture = {
  input: {
    targetSymbol: 't',
    targetKeyCaps: ['KeyT'],
    attempts: [],
  },
  expectedOutput: {
    L1: { navigationRole: "INACTIVE" },
    L2: {
      navigationRole: "TARGET",
      keyCapStates: {
        Digit4: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" },
        Digit5: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" },
        KeyR: { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "RIGHT", pressResult: "NONE" },
        KeyT: { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NONE" },
        KeyF: { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "UP", pressResult: "NONE" },
        KeyG: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" },
        KeyV: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" },
        KeyB: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" }
      },
    },
    L3: { navigationRole: "INACTIVE" }, L4: { navigationRole: "INACTIVE" }, L5: { navigationRole: "INACTIVE" }, LB: { navigationRole: "INACTIVE" },
    R1: { navigationRole: 'NONE' }, R2: { navigationRole: 'NONE' }, R3: { navigationRole: 'NONE' }, R4: { navigationRole: 'NONE' }, R5: { navigationRole: 'NONE' }, RB: { navigationRole: 'NONE' },
  }
};
