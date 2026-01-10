import { HandsExtFixture } from './types';

export const simple_6: HandsExtFixture = {
  input: {
    targetSymbol: '6',
    targetKeyCaps: ['Digit6'],
    attempts: [],
  },
  expectedOutput: {
    L1: { fingerState: 'NONE' }, L2: { fingerState: 'NONE' }, L3: { fingerState: 'NONE' }, L4: { fingerState: 'NONE' }, L5: { fingerState: 'NONE' }, LB: { fingerState: 'NONE' },
    R1: { fingerState: "INACTIVE" },
    R2: {
      fingerState: "TARGET",
      keyCapStates: {
        Digit6: { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Digit7: { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "LEFT", pressResult: "NEUTRAL" },
        KeyY: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyU: { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "UP", pressResult: "NEUTRAL" },
        KeyH: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyJ: { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "UP", pressResult: "NEUTRAL" },
        KeyN: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyM: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" }
      },
    },
    R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" },
  }
};
