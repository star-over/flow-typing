import { HandsExtFixture } from './types';

export const shiftFFixture: HandsExtFixture = {
  input: {
    targetSymbol: 'F',
    targetKeyCaps: ['KeyF', 'ShiftRight'],
    attempts: [],
  },
  expectedOutput: {
    L1: { fingerState: "INACTIVE" }, L3: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" },
    L2: {
      fingerState: "ACTIVE",
      keyCapStates: {
        "KeyF":     { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "Digit4":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "Digit5":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "KeyR":     { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "KeyT":     { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "KeyG":     { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "KeyV":     { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "KeyB":     { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" }
      }
    },
    R5: {
      fingerState: "ACTIVE",
      keyCapStates: {
        "Semicolon":    { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
        "Quote":        { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
        "ShiftRight":   { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "Digit0":       { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "Minus":        { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "Equal":        { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "Backspace":    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "KeyP":         { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "BracketLeft":  { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "BracketRight": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "Backslash":    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        "Enter":        { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "DOWN", pressResult: "NEUTRAL" },
      }
    },
  }
};
