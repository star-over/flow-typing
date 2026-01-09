import { HandsExtFixture } from './types';

export const simpleKErrorFixture: HandsExtFixture = {
  input: {
    targetSymbol: 'k',
    targetKeyCaps: ['KeyK'],
    attempts: [
      {
        pressedKeyCups: ['KeyJ'], // Assuming 'KeyJ' was the incorrect key pressed, associated with R2
        startAt: 0,
        endAt: 0,
      }
    ],
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" }, L2: { fingerState: "INACTIVE" }, L3: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INCORRECT" },
    R3: {
      fingerState: "ACTIVE",
      keyCapStates: {
        "Digit8": { visibility: "VISIBLE", navigationRole: "NONE",      navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "KeyI":   { visibility: "VISIBLE", navigationRole: "NONE",      navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "KeyK":   { visibility: "VISIBLE", navigationRole: "TARGET",    navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "Comma":  { visibility: "VISIBLE", navigationRole: "NONE",      navigationArrow: "NONE", pressResult: "NEUTRAL" }
      }
    },
    R4: { fingerState: "INACTIVE" }, R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" },
  }
};
