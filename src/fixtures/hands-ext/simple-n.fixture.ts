import { HandsExtFixture } from './types';

export const simpleNFixture: HandsExtFixture = {
  input: {
    targetSymbol: 'n',
    targetKeyCaps: ['KeyN'],
    attempts: [],
  },
  expectedOutput: {
    L1: { fingerState: 'IDLE' }, L2: { fingerState: 'IDLE' }, L3: { fingerState: 'IDLE' }, L4: { fingerState: 'IDLE' }, L5: { fingerState: 'IDLE' }, LB: { fingerState: 'IDLE' },
    R1: { fingerState: "INACTIVE"},
    R2: {
        fingerState: "ACTIVE",
        keyCapStates: {
      "Digit6": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Digit7": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyY":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyU":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyH":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyJ":   { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "DOWN", pressResult: "NEUTRAL" },
      "KeyN":   { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyM":   { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "LEFT", pressResult: "NEUTRAL" }
    },
    },
    R3: { fingerState: "INACTIVE"}, R4: { fingerState: "INACTIVE"}, R5: { fingerState: "INACTIVE"}, RB: { fingerState: "INACTIVE"},
  }
};
