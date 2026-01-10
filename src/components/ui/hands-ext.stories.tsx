import type { Meta, StoryObj } from '@storybook/react';

import { idle } from '@/fixtures/hands-ext/idle';
import { shift_b } from '@/fixtures/hands-ext/shift_b';
import { shift_f } from '@/fixtures/hands-ext/shift_f';
import { shift_o } from '@/fixtures/hands-ext/shift_o';
import { shift_o_error_simple_o } from '@/fixtures/hands-ext/shift_o_error_simple_o';
import { shift_t_error_shift_n } from '@/fixtures/hands-ext/shift_t_error_shift_n';
import { simple_6 } from '@/fixtures/hands-ext/simple_6';
import { simple_e_error_shift_F } from '@/fixtures/hands-ext/simple_e_error_shift_F';
import { simple_e_error_simple_d } from '@/fixtures/hands-ext/simple_e_error_simple_d';
import { simple_e_error_space } from '@/fixtures/hands-ext/simple_e_error_space';
import { simple_k } from '@/fixtures/hands-ext/simple_k';
import { simple_k_error_simple_j } from '@/fixtures/hands-ext/simple_k_error_simple_j';
import { simple_r_error_simple_f } from '@/fixtures/hands-ext/simple_r_error_simple_f';
import { simple_space } from '@/fixtures/hands-ext/simple_space';
import { simple_t } from '@/fixtures/hands-ext/simple_t';

import { HandsExt } from './hands-ext';

const className = 'pt-40';
const meta = {
  title: 'UI/HandsExt',
  component: HandsExt,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: { viewModel: {} }
} satisfies Meta<typeof HandsExt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    viewModel: idle.expectedOutput,
    className,
  },
};

export const simpleSpace: Story = {
  args: {
    viewModel: simple_space.expectedOutput,
    className,
  },
};

export const simpleEErrorSimpleD: Story = {
  args: {
    viewModel: simple_e_error_simple_d.expectedOutput,
    className,
  },
};

export const shiftTErrorShiftN: Story = {
  args: {
    viewModel: shift_t_error_shift_n.expectedOutput,
    className,
  },
};

export const shiftOErrorSimpleO: Story = {
  args: {
    viewModel: shift_o_error_simple_o.expectedOutput,
    className,
  },
};

export const shiftO: Story = {
  args: {
    viewModel: shift_o.expectedOutput,
    className,
  },
};

export const simpleEErrorShiftF: Story = {
  args: {
    viewModel: simple_e_error_shift_F.expectedOutput,
    className,
  },
};

export const simpleEErrorSpace: Story = {
  args: {
    viewModel: simple_e_error_space.expectedOutput,
    className,
  },
};

export const simpleT: Story = {
  args: {
    viewModel: simple_t.expectedOutput,
    className,
  },
};

export const simpleK: Story = {
  args: {
    viewModel: simple_k.expectedOutput,
    className,
  },
};

export const SimpleKErrorSimpleJ: Story = {
  args: {
    viewModel: simple_k_error_simple_j.expectedOutput,
    className,
  },
};
export const simpleRErrorSimpleF: Story = {
  args: {
    viewModel: simple_r_error_simple_f.expectedOutput,
    className,
  },
};

export const Simple6: Story = {
  args: {
    viewModel: simple_6.expectedOutput,
    className,
  },
};


export const ShiftF: Story = {
  args: {
    viewModel: shift_f.expectedOutput,
    className,
  },
};

export const ShiftB: Story = {
  args: {
    viewModel: shift_b.expectedOutput,
    className,
  },
};
