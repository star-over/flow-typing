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
    R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" },
  }
};
