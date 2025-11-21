
import type { Meta, StoryObj } from '@storybook/react';

import { FingerId, FingerState } from "@/interfaces/types";
import { Finger } from "./finger";

const meta = {
  title: 'UI/Finger',
  component: Finger,
  argTypes: {
    part: {
      options: ["L1", "L2", "L3", "L4", "L5", "LB"] satisfies FingerId[],
      control: "inline-radio",
    },
    state: {
      options: ["IDLE", "ACTIVE", "INACTIVE", "INCORRECT"]  satisfies FingerState[],
      control: "inline-radio",
    }
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Finger>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    part: meta.argTypes.part.options[0],
    state: meta.argTypes.state.options[0],
  },
};
