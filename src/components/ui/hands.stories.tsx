
import type { Meta, StoryObj } from '@storybook/react';

import { FINGER_STATES } from "@/interfaces/types";

import { Hands } from './hands';

const fingerOptions = {
  options: FINGER_STATES,
  control: "inline-radio",
} as const;

const meta = {
  title: 'UI/Hands',
  component: Hands,
  argTypes: {
    L1: fingerOptions,
    L2: fingerOptions,
    L3: fingerOptions,
    L4: fingerOptions,
    L5: fingerOptions,
    LB: fingerOptions,
    R1: fingerOptions,
    R2: fingerOptions,
    R3: fingerOptions,
    R4: fingerOptions,
    R5: fingerOptions,
    RB: fingerOptions,
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Hands>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    L1: fingerOptions.options[0],
    L2: fingerOptions.options[0],
    L3: fingerOptions.options[0],
    L4: fingerOptions.options[0],
    L5: fingerOptions.options[0],
    LB: fingerOptions.options[0],
    R1: fingerOptions.options[0],
    R2: fingerOptions.options[0],
    R3: fingerOptions.options[0],
    R4: fingerOptions.options[0],
    R5: fingerOptions.options[0],
    RB: fingerOptions.options[0],
  },
};

export const Default1: Story = {
  args: {
    L1: fingerOptions.options[1],
    L2: fingerOptions.options[2],
    L3: fingerOptions.options[3],
    L4: fingerOptions.options[0],
  },
};
