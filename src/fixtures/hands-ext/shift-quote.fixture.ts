import { HandsExtFixture } from './types';

export const shiftQuoteFixture: HandsExtFixture = {
  input: {
    targetSymbol: '"',
    targetKeyCaps: ['Quote', 'ShiftLeft'],
    attempts: [],
  },
  expectedOutput: {
    L1: { fingerState: "IDLE" }, L2: { fingerState: "INACTIVE" }, L3: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
    R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" },
    L5: {
      fingerState: "ACTIVE",
      keyCapStates: {
        Backquote:   { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Digit1:      { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
        KeyA:        { visibility: "VISIBLE", navigationRole: "PATH",     navigationArrow: "DOWN", pressResult: "NEUTRAL" }, // Home key
        KeyQ:        { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
        CapsLock:    { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
        Tab:         { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
        KeyZ:        { visibility: "VISIBLE", navigationRole: "PATH",     navigationArrow: "LEFT", pressResult: "NEUTRAL" }, // Home key
        ShiftLeft:   { visibility: "VISIBLE", navigationRole: "TARGET",   navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
        ControlLeft: { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
        MetaLeft:    { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
        AltLeft:     { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      }
    },
    R5: {
      fingerState: "ACTIVE",
      keyCapStates: {
        Semicolon:    { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
        Quote:        { visibility: "VISIBLE", navigationRole: "TARGET",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
        ShiftRight:   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Digit0:       { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Minus:        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Equal:        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Backspace:    { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
        KeyP:         { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
        BracketLeft:  { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
        BracketRight: { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Backslash:    { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
        Enter:        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      }
    },
  }
};
