import { HandsExtFixture } from './types';

export const shiftDFixture: HandsExtFixture = {
  input: {
    targetSymbol: 'D',
    targetKeyCaps: ['KeyD', 'ShiftRight'],
    attempts: [],
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" }, L2: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" },
    L3: {
      fingerState: "ACTIVE",
      keyCapStates: {
        KeyD:    { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
        KeyE:    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Digit3:  { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyC:    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      }
    },
    R5: {
      fingerState: "ACTIVE",
      keyCapStates: {
        Semicolon:    { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
        Quote:        { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
        ShiftRight:   { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Digit0:       { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Minus:        { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Equal:        { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Backspace:    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyP:         { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        BracketLeft:  { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        BracketRight: { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Backslash:    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Enter:        { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "DOWN", pressResult: "NEUTRAL" },
      }
    },
  }
};
