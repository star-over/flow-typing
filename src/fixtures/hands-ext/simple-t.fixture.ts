import { HandsExtFixture } from './types';

export const simpleTFixture: HandsExtFixture = {
  input: {
    targetSymbol: 't',
    targetKeyCaps: ['KeyT'],
    attempts: [],
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE"}, L3: { fingerState: "INACTIVE"}, L4: { fingerState: "INACTIVE"}, L5: { fingerState: "INACTIVE"}, LB: { fingerState: "INACTIVE"},
    R1: { fingerState: 'IDLE' }, R2: { fingerState: 'IDLE' }, R3: { fingerState: 'IDLE' }, R4: { fingerState: 'IDLE' }, R5: { fingerState: 'IDLE' }, RB: { fingerState: 'IDLE' },
    L2: { fingerState: "ACTIVE",
        keyCapStates: {
      "Digit4": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Digit5": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyR":   { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
      "KeyT":   { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyF":   { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "UP", pressResult: "NEUTRAL" },
      "KeyG":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyV":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyB":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" }
    },
   },
  }
};
