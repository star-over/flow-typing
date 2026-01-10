import { HandsExtFixture } from './types';

export const simpleCFixture: HandsExtFixture = {
  input: {
    targetSymbol: 'c',
    targetKeyCaps: ['KeyC'],
    attempts: [],
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE"}, L2: { fingerState: "INACTIVE"}, L4: { fingerState: "INACTIVE"}, L5: { fingerState: "INACTIVE"}, LB: { fingerState: "INACTIVE"},
    R1: { fingerState: 'IDLE' }, R2: { fingerState: 'IDLE' }, R3: { fingerState: 'IDLE' }, R4: { fingerState: 'IDLE' }, R5: { fingerState: 'IDLE' }, RB: { fingerState: 'IDLE' },
    L3: { fingerState: "ACTIVE",
        keyCapStates: {
      Digit3: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      KeyE:   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      KeyD:   { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "DOWN", pressResult: "NEUTRAL" },
      KeyC:   { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
    },
   },
  }
};
