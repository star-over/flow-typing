
import type { Meta, StoryObj } from '@storybook/react';

import { Hand } from './hand';
import { HandSide } from "@/interfaces/types";

const meta = {
  title: 'UI/Hand',
  component: Hand,
  argTypes: {
    side: {
      options: ["LEFT", "RIGHT"] satisfies HandSide[],
      control: "inline-radio",
    }
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Hand>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Right: Story = {
  args: {
    side: 'RIGHT',
  },
};

export const Left: Story = {
  args: {
    side: 'LEFT',
  },
};
