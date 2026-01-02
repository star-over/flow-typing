
import type { Meta, StoryObj } from '@storybook/react';

import { LEFT_HAND_FINGER_IDS, FINGER_STATES } from "@/interfaces/types";

import { Finger } from "./finger";

const meta = {
  title: 'UI/Finger',
  component: Finger,
  argTypes: {
    part: {
      options: LEFT_HAND_FINGER_IDS,
      control: "inline-radio",
    },
    state: {
      options: FINGER_STATES,
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
