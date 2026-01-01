import type { Meta, StoryObj } from '@storybook/react';

import { HandStates } from '@/interfaces/types';

import { HandsExt } from './hands-ext';

const meta = {
  title: 'UI/HandsExt',
  component: HandsExt,
  parameters: {
    layout: 'fullscreen',
  },

} satisfies Meta<typeof HandsExt>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock hand states for demonstration
const mockHandStates: HandStates = { // Explicitly cast to HandStates
  L5: "IDLE",
  L4: "IDLE",
  L3: "IDLE",
  L2: "IDLE",
  L1: "IDLE",
  R1: "IDLE",
  R2: "IDLE",
  R3: "IDLE",
  R4: "IDLE",
  R5: "IDLE",
  LB: "IDLE",
  RB: "IDLE",
};

export const Default: Story = {
  args: {
    highlightedFingerKeys: {},
    handStates: mockHandStates,
  },
};

export const ShiftFCombination: Story = {
  args: {
    highlightedFingerKeys: {
      L2: ['KeyF'], // Left Index finger presses 'F'
      R5: ['ShiftRight'], // Right Pinky presses 'ShiftRight'
    },
    handStates: {
      ...mockHandStates,
      L2: "ACTIVE",
      R5: "ACTIVE",
    },
  },
};

export const SingleKeyPress: Story = {
  args: {
    highlightedFingerKeys: {
      L2: ['KeyA'], // Left Index finger presses 'A'
    },
    handStates: {
      ...mockHandStates,
      L2: "ACTIVE",
    },
  },
};

// You can add more stories for different combinations
