import { HandsExtFixture } from './types';
export const simple_space: HandsExtFixture = {
  input: {
    targetSymbol: " ",
    targetKeyCaps: ["Space"], attempts: []
  },
  expectedOutput: {
    L1: { fingerState: "IDLE" }, L2: { fingerState: "IDLE" }, L3: { fingerState: "IDLE" }, L4: { fingerState: "IDLE" }, L5: { fingerState: "IDLE" }, LB: { fingerState: "IDLE" },
    R1: {
      fingerState: "ACTIVE",
      keyCapStates: { Space: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NEUTRAL", navigationArrow: "NONE" } }
    },
    R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" }
  },
};
