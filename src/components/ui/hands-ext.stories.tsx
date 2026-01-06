import type { Meta, StoryObj } from '@storybook/react';

import { HandsSceneViewModel } from '@/interfaces/types';

import { HandsExt } from './hands-ext';

// --- Mock ViewModel Data ---
// Эти моки HandsSceneViewModel используются для тестирования различных состояний
// компонента HandsExt в Storybook. При добавлении новой сложной логики
// рендеринга в HandsExt, настоятельно рекомендуется создавать новый мок
// и новую историю для его изолированного тестирования.
// Based on examples from /VisualContract.md

const idleViewModel: HandsSceneViewModel = {
  L1: { fingerState: 'IDLE' }, L2: { fingerState: 'IDLE' }, L3: { fingerState: 'IDLE' }, L4: { fingerState: 'IDLE' }, L5: { fingerState: 'IDLE' }, LB: { fingerState: 'IDLE' },
  R1: { fingerState: 'IDLE' }, R2: { fingerState: 'IDLE' }, R3: { fingerState: 'IDLE' }, R4: { fingerState: 'IDLE' }, R5: { fingerState: 'IDLE' }, RB: { fingerState: 'IDLE' },
};

/*
 * Best Practice: Для создания состояний рекомендуется использовать композицию.
 * 1. Начните с `...idleViewModel`, чтобы гарантировать наличие всех пальцев.
 * 2. Добавьте `...leftInactive` или `...rightInactive`, чтобы "выключить" неиспользуемую руку.
 * 3. Явно определите состояние для одного или нескольких АКТИВНЫХ пальцев.
*/
const leftInactive : Partial<HandsSceneViewModel> =  {
  L1: { fingerState: "INACTIVE"}, L2: { fingerState: "INACTIVE"}, L3: { fingerState: "INACTIVE"}, L4: { fingerState: "INACTIVE"}, L5: { fingerState: "INACTIVE"}, LB: { fingerState: "INACTIVE"},
};
const rightInactive : Partial<HandsSceneViewModel> =  {
  R1: { fingerState: "INACTIVE"}, R2: { fingerState: "INACTIVE"}, R3: { fingerState: "INACTIVE"}, R4: { fingerState: "INACTIVE"}, R5: { fingerState: "INACTIVE"}, RB: { fingerState: "INACTIVE"},
};

const simpleK: HandsSceneViewModel = {
  ...idleViewModel,
  ...rightInactive,
  R3: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Digit8": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyI":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyK":   { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Comma":  { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" }
    }
  }
};

const simpleN: HandsSceneViewModel = {
  ...idleViewModel,
  ...rightInactive,
  R2: { fingerState: "ACTIVE",
        keyCapStates: {
      "Digit6": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Digit7": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyY":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyU":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyH":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyJ":   { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "DOWN", pressResult: "NEUTRAL" },
      "KeyN":   { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyM":   { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "LEFT", pressResult: "NEUTRAL" }
    },
   },

};

const simpleT: HandsSceneViewModel = {
  ...idleViewModel,
  ...leftInactive,
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
};

const simpleC: HandsSceneViewModel = {
  ...idleViewModel,
  ...leftInactive,
  L3: { fingerState: "ACTIVE",
        keyCapStates: {
      "Digit3": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyE":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyD":   { visibility: "VISIBLE", navigationRole: "PATH", navigationArrow: "DOWN", pressResult: "NEUTRAL" },
      "KeyC":   { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
    },
   },

};

const simple2: HandsSceneViewModel = {
  ...idleViewModel,
  ...leftInactive,
  L4: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Digit2": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyW":   { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "UP", pressResult: "NEUTRAL" },
      "KeyS":   { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "UP", pressResult: "NEUTRAL" },
      "KeyX":   { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" }
    }
  },
};

const shiftF: HandsSceneViewModel = {
  ...idleViewModel,
  ...leftInactive,
  ...rightInactive,
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
};

const simpleKError: HandsSceneViewModel = {
  ...idleViewModel,
  ...leftInactive,
  ...rightInactive,
  R2: { fingerState: "INCORRECT" },
  R3: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Digit8": { visibility: "VISIBLE", navigationRole: "NONE",      navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyI":   { visibility: "VISIBLE", navigationRole: "NONE",      navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyK":   { visibility: "VISIBLE", navigationRole: "TARGET",    navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Comma":  { visibility: "VISIBLE", navigationRole: "NONE",      navigationArrow: "NONE", pressResult: "NEUTRAL" }
    }
  },
};

const spaceLeft: HandsSceneViewModel = {
  ...idleViewModel,
  ...leftInactive,
  L1: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "SpaceLeft": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
    }
  },
};

const spaceRight: HandsSceneViewModel = {
  ...idleViewModel,
  ...rightInactive,
  R1: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "SpaceRight": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
    }
  },
};

const shiftD: HandsSceneViewModel = {
  ...idleViewModel,
  ...leftInactive,
  ...rightInactive,
  L3: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "KeyD":    { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "KeyE":    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Digit3":  { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyC":    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
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
};

// For Shift + Equal ('+')
const shiftPlus: HandsSceneViewModel = {
  ...idleViewModel,
  ...leftInactive,
  ...rightInactive,
  L5: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Backquote":   { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Digit1":      { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "KeyA":        { visibility: "VISIBLE", navigationRole: "PATH",     navigationArrow: "DOWN", pressResult: "NEUTRAL" }, // Home key
      "KeyQ":        { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "CapsLock":    { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "Tab":         { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "KeyZ":        { visibility: "VISIBLE", navigationRole: "PATH",     navigationArrow: "LEFT", pressResult: "NEUTRAL" }, // Home key
      "ShiftLeft":   { visibility: "VISIBLE", navigationRole: "TARGET",   navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "ControlLeft": { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "MetaLeft":    { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "AltLeft":     { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
    }
  },
  R5: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Semicolon":    { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "UP", pressResult: "NEUTRAL" },
      "Quote":        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "ShiftRight":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Digit0":       { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
      "Minus":        { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
      "Equal":        { visibility: "VISIBLE", navigationRole: "TARGET",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Backspace":    { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyP":         { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "UP", pressResult: "NEUTRAL" },
      "BracketLeft":  { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "BracketRight": { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Backslash":    { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Enter":        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
    }
  },
};

// For Shift + BracketRight ('}')
const shiftCurlyBrace: HandsSceneViewModel = {
  ...idleViewModel,
  ...leftInactive,
  ...rightInactive,
  L5: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Backquote":   { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Digit1":      { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "KeyA":        { visibility: "VISIBLE", navigationRole: "PATH",     navigationArrow: "DOWN", pressResult: "NEUTRAL" }, // Home key
      "KeyQ":        { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "CapsLock":    { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "Tab":         { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "KeyZ":        { visibility: "VISIBLE", navigationRole: "PATH",     navigationArrow: "LEFT", pressResult: "NEUTRAL" }, // Home key
      "ShiftLeft":   { visibility: "VISIBLE", navigationRole: "TARGET",   navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "ControlLeft": { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "MetaLeft":    { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "AltLeft":     { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
    }
  },
  R5: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Semicolon":    { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "UP", pressResult: "NEUTRAL" },
      "Quote":        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "ShiftRight":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Digit0":       { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Minus":        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Equal":        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Backspace":    { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyP":         { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
      "BracketLeft":  { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
      "BracketRight": { visibility: "VISIBLE", navigationRole: "TARGET",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Backslash":    { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Enter":        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
    }
  },
};

// For Shift + Quote ('"')
const shiftQuote: HandsSceneViewModel = {
  ...idleViewModel,
  ...leftInactive,
  ...rightInactive,
  L5: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Backquote":   { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Digit1":      { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "KeyA":        { visibility: "VISIBLE", navigationRole: "PATH",     navigationArrow: "DOWN", pressResult: "NEUTRAL" }, // Home key
      "KeyQ":        { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "CapsLock":    { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "Tab":         { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "KeyZ":        { visibility: "VISIBLE", navigationRole: "PATH",     navigationArrow: "LEFT", pressResult: "NEUTRAL" }, // Home key
      "ShiftLeft":   { visibility: "VISIBLE", navigationRole: "TARGET",   navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "ControlLeft": { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "MetaLeft":    { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "AltLeft":     { visibility: "VISIBLE", navigationRole: "NONE",     navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
    }
  },
  R5: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Semicolon":    { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
      "Quote":        { visibility: "VISIBLE", navigationRole: "TARGET",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "ShiftRight":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Digit0":       { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Minus":        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Equal":        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Backspace":    { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyP":         { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "BracketLeft":  { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "BracketRight": { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Backslash":    { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Enter":        { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" },
    }
  },
};


const meta = {
  title: 'UI/HandsExt',
  component: HandsExt,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    viewModel: {
      control: 'object',
    }
  }
} satisfies Meta<typeof HandsExt>;

export default meta;
type Story = StoryObj<typeof meta>;


export const Idle: Story = {
  args: {
    viewModel: idleViewModel,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const SimpleK: Story = {
  args: {
    viewModel: simpleK,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const SimpleKError: Story = {
  args: {
    viewModel: simpleKError,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const SimpleN: Story = {
  args: {
    viewModel: simpleN,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const SimpleT: Story = {
  args: {
    viewModel: simpleT,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const SimpleC: Story = {
  args: {
    viewModel: simpleC,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const ShiftF: Story = {
  args: {
    viewModel: shiftF,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const ShiftD: Story = {
  args: {
    viewModel: shiftD,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const Simple2: Story = {
  args: {
    viewModel: simple2,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const SpaceLeft: Story = {
  args: {
    viewModel: spaceLeft,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const SpaceRight: Story = {
  args: {
    viewModel: spaceRight,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};


export const ShiftPlus: Story = {
  args: {
    viewModel: shiftPlus,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const ShiftCurlyBrace: Story = {
  args: {
    viewModel: shiftCurlyBrace,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};

export const ShiftQuote: Story = {
  args: {
    viewModel: shiftQuote,
    centerPointVisibility: 'VISIBLE',
    className: 'pt-12',
  },
};
