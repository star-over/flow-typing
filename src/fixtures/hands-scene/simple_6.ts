import type { HandsSceneFixture } from './types';

export const simple_6: HandsSceneFixture = {
  input: {
    targetSymbol: '6',
    targetKeyCaps: ['Digit6'],
    attempts: [],
  },
  expectedOutput: {
    L1: { navigationRole: 'NONE' }, L2: { navigationRole: 'NONE' }, L3: { navigationRole: 'NONE' }, L4: { navigationRole: 'NONE' }, L5: { navigationRole: 'NONE' }, LB: { navigationRole: 'NONE' },
    R1: { navigationRole: "INACTIVE" },
    R2: {
      navigationRole: "TARGET",
      keyCapStates: {
        Digit6: { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NONE" },
        Digit7: { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "LEFT", pressResult: "NONE" },
        KeyY: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" },
        KeyU: { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "UP", pressResult: "NONE" },
        KeyH: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" },
        KeyJ: { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "UP", pressResult: "NONE" },
        KeyN: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" },
        KeyM: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NONE" }
      },
    },
    R3: { navigationRole: "INACTIVE" }, R4: { navigationRole: "INACTIVE" }, R5: { navigationRole: "INACTIVE" }, RB: { navigationRole: "INACTIVE" },
  }
};
