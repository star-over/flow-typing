import type { Meta, StoryObj } from '@storybook/react';

import { FlowHand } from './flow-hand';
import { FingerId, FingerState, HandSide } from "@/interfaces/types";

const meta = {
  title: 'UI/FlowHand',
  component: FlowHand,
  argTypes: {
    side: {
      options: ["LEFT", "RIGHT"] satisfies HandSide[],
      control: "inline-radio",
    },
    activeFingerId: {
      options: [
        "NONE",
        "L1", "L2", "L3", "L4", "L5",
        "R1", "R2", "R3", "R4", "R5",
      ] satisfies FingerId[],
      control: "select",
    },
    fingerState: {
      options: [
        "IDLE", "ACTIVE", "INACTIVE", "INCORRECT",
      ] satisfies FingerState[],
      control: "inline-radio",
    }
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof FlowHand>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    side: 'RIGHT',
    activeFingerId: "NONE",
    fingerState: "IDLE",
  },
};

export const RightHandActiveIndexFinger: Story = {
  args: {
    side: 'RIGHT',
    activeFingerId: "R2",
    fingerState: "ACTIVE",
  },
};

export const LeftHandActivePinkyFinger: Story = {
  args: {
    side: 'LEFT',
    activeFingerId: "L5",
    fingerState: "ACTIVE",
  },
};

export const RightHandIncorrectThumb: Story = {
  args: {
    side: 'RIGHT',
    activeFingerId: "R1",
    fingerState: "INCORRECT",
  },
};

export const LeftHandInactiveMiddleFinger: Story = {
  args: {
    side: 'LEFT',
    activeFingerId: "L3",
    fingerState: "INACTIVE",
  },
};
