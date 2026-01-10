import { HandsExtFixture } from './types';

export const simple_t: HandsExtFixture = {
  input: {
    targetSymbol: 't',
    targetKeyCaps: ['KeyT'],
    attempts: [],
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" },
    L2: {
      fingerState: "TARGET",
      keyCapStates: {
        Digit4: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Digit5: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyR: { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
        KeyT: { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyF: { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "UP", pressResult: "NEUTRAL" },
        KeyG: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyV: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyB: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" }
      },
    },
    L3: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: 'NONE' }, R2: { fingerState: 'NONE' }, R3: { fingerState: 'NONE' }, R4: { fingerState: 'NONE' }, R5: { fingerState: 'NONE' }, RB: { fingerState: 'NONE' },
  }
};
