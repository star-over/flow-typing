import { HandsExtFixture } from './types';

export const simple2Fixture: HandsExtFixture = {
  input: {
    targetSymbol: '2',
    targetKeyCaps: ['Digit2'],
    attempts: [],
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE"}, L2: { fingerState: "INACTIVE"}, L3: { fingerState: "INACTIVE"}, L5: { fingerState: "INACTIVE"}, LB: { fingerState: "INACTIVE"},
    R1: { fingerState: 'IDLE' }, R2: { fingerState: 'IDLE' }, R3: { fingerState: 'IDLE' }, R4: { fingerState: 'IDLE' }, R5: { fingerState: 'IDLE' }, RB: { fingerState: 'IDLE' },
    L4: {
      fingerState: "ACTIVE",
      keyCapStates: {
        "Digit2": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "KeyW":   { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "UP", pressResult: "NEUTRAL" },
        "KeyS":   { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "UP", pressResult: "NEUTRAL" },
        "KeyX":   { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" }
      }
    },
  }
};
