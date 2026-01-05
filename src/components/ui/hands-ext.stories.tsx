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

const simplePressViewModel: HandsSceneViewModel = {
  L1: { fingerState: "IDLE" }, L2: { fingerState: "IDLE" }, L3: { fingerState: "IDLE" }, L4: { fingerState: "IDLE" }, L5: { fingerState: "IDLE" }, LB: { fingerState: "IDLE" },
  R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" },
  R3: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Digit8": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyI":   { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyK":   { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "Comma":  { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" }
    }
  },
  R4: { fingerState: "INACTIVE" }, R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" }
};

const movementViewModel: HandsSceneViewModel = {
  L1: { fingerState: "INACTIVE" }, L2: { fingerState: "INACTIVE" }, L3: { fingerState: "INACTIVE" },
  L4: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Digit2": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyW":   { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "UP", pressResult: "NEUTRAL" },
      "KeyS":   { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "UP", pressResult: "NEUTRAL" },
      "KeyX":   { visibility: "VISIBLE", navigationRole: "NONE",   navigationArrow: "NONE", pressResult: "NEUTRAL" }
    }
  },
  L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
  R1: { fingerState: "IDLE" }, R2: { fingerState: "IDLE" }, R3: { fingerState: "IDLE" }, R4: { fingerState: "IDLE" }, R5: { fingerState: "IDLE" }, RB: { fingerState: "IDLE" }
};

const chordViewModel: HandsSceneViewModel = {
  L1: { fingerState: "INACTIVE" },
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
  L3: { fingerState: "INACTIVE" }, L4: { fingerState: "INACTIVE" }, L5: { fingerState: "INACTIVE" }, LB: { fingerState: "INACTIVE" },
  R1: { fingerState: "INACTIVE" }, R2: { fingerState: "INACTIVE" }, R3: { fingerState: "INACTIVE" }, R4: { fingerState: "INACTIVE" },
  R5: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "Semicolon":  { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
      "Quote":      { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "RIGHT", pressResult: "NEUTRAL" },
      "ShiftRight": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
    }
  },
  RB: { fingerState: "INACTIVE" }
};

const errorViewModel: HandsSceneViewModel = {
  L1: { fingerState: "IDLE" }, L2: { fingerState: "IDLE" }, L3: { fingerState: "IDLE" }, L4: { fingerState: "IDLE" }, L5: { fingerState: "IDLE" }, LB: { fingerState: "IDLE" },
  R1: { fingerState: "INACTIVE" },
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
  R4: { fingerState: "INACTIVE" }, R5: { fingerState: "INACTIVE" }, RB: { fingerState: "INACTIVE" }
};

const spaceLeftViewModel: HandsSceneViewModel = {
  ...idleViewModel, // Start with all IDLE
  L1: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "SpaceLeft": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      // Assuming 'KeyA' was previously pressed by L5 for context, though not strictly necessary for this view model
      "KeyA": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" }, 
    }
  },
};

const spaceRightViewModel: HandsSceneViewModel = {
  ...idleViewModel, // Start with all IDLE
  R1: {
    fingerState: "ACTIVE",
    keyCapStates: {
      "SpaceRight": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      // Assuming 'Semicolon' was previously pressed by R5 for context
      "Semicolon": { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" }, 
    }
  },
};

const shiftLeftChordViewModel: HandsSceneViewModel = {
  ...idleViewModel, // Start with all IDLE
  L5: { // Left little finger for ShiftLeft
    fingerState: "ACTIVE",
    keyCapStates: {
      "ShiftLeft": { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyA":      { visibility: "VISIBLE", navigationRole: "PATH",   navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
    }
  },
  L3: { // Left middle finger for KeyD
    fingerState: "ACTIVE",
    keyCapStates: {
      "KeyD":    { visibility: "VISIBLE", navigationRole: "TARGET", navigationArrow: "NONE", pressResult: "NEUTRAL" }, // Home key
      "KeyE":    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
      "KeyC":    { visibility: "VISIBLE", navigationRole: "NONE", navigationArrow: "NONE", pressResult: "NEUTRAL" },
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
    className: 'p-12',
  },
};

export const SimplePress: Story = {
  args: {
    viewModel: simplePressViewModel,
    centerPointVisibility: 'VISIBLE',
    className: 'p-12',
  },
};

export const Movement: Story = {
  args: {
    viewModel: movementViewModel,
    centerPointVisibility: 'VISIBLE',
    className: 'p-12',
  },
};

export const Chord: Story = {
  args: {
    viewModel: chordViewModel,
    centerPointVisibility: 'VISIBLE',
    className: 'p-12',
  },
};

export const Error: Story = {
  args: {
    viewModel: errorViewModel,
    centerPointVisibility: 'VISIBLE',
    className: 'p-12',
  },
};

export const SpaceLeft: Story = {
  args: {
    viewModel: spaceLeftViewModel,
    centerPointVisibility: 'VISIBLE',
    className: 'p-12',
  },
};

export const SpaceRight: Story = {
  args: {
    viewModel: spaceRightViewModel,
    centerPointVisibility: 'VISIBLE',
    className: 'p-12',
  },
};

export const ShiftLeftChord: Story = {
  args: {
    viewModel: shiftLeftChordViewModel,
    centerPointVisibility: 'VISIBLE',
    className: 'p-12',
  },
};
