import type { HandsSceneFixture } from './types';
export const simple_space: HandsSceneFixture = {
  input: {
    targetSymbol: " ",
    targetKeyCaps: ["Space"], attempts: []
  },
  expectedOutput: {
    L1: { navigationRole: "NONE" }, L2: { navigationRole: "NONE" }, L3: { navigationRole: "NONE" }, L4: { navigationRole: "NONE" }, L5: { navigationRole: "NONE" }, LB: { navigationRole: "NONE" },
    R1: {
      navigationRole: "TARGET",
      navigationPath: ["Space"],
      keyCapStates: { Space: { visibility: "VISIBLE", navigationRole: "TARGET", pressResult: "NONE", navigationArrow: "NONE" } }
    },
    R2: { navigationRole: "INACTIVE" }, R3: { navigationRole: "INACTIVE" }, R4: { navigationRole: "INACTIVE" }, R5: { navigationRole: "INACTIVE" }, RB: { navigationRole: "INACTIVE" }
  },
};
