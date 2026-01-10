import { HandsExtFixture } from './types';
export const simple_space: HandsExtFixture = {
  input: {
    targetSymbol: " ",
    targetKeyCaps: ["Space"], attempts: []
  },
  expectedOutput: {
    L1: { fingerState: "NONE" }, L2: { fingerState: "NONE" }, L3: { fingerState: "NONE" }, L4: { fingerState: "NONE" }, L5: { fingerState: "NONE" }, LB: { fingerState: "NONE" },
    R1: {
      fingerState: "TARGET",
      keyCapStates: { Space: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" } }
    },
    R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" }
  },
};
