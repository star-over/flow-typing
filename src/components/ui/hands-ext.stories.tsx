import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Geist, Geist_Mono } from 'next/font/google';

import { fingerLayoutASDF } from '@/data/finger-layout-asdf';
import { keyboardLayoutANSI } from '@/data/keyboard-layout-ansi';
import { symbolLayoutEnQwerty } from '@/data/symbol-layout-en';
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

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const className = 'pt-40';
const meta = {
  title: 'UI/HandsExt',
  component: HandsExt,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: { viewModel: {} },
  decorators: [
    (Story) => (
      <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HandsExt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    viewModel: idle.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const simpleSpace: Story = {
  args: {
    viewModel: simple_space.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const simpleEErrorSimpleD: Story = {
  args: {
    viewModel: simple_e_error_simple_d.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const shiftTErrorShiftN: Story = {
  args: {
    viewModel: shift_t_error_shift_n.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const shiftOErrorSimpleO: Story = {
  args: {
    viewModel: shift_o_error_simple_o.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const shiftO: Story = {
  args: {
    viewModel: shift_o.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const simpleEErrorShiftF: Story = {
  args: {
    viewModel: simple_e_error_shift_F.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const simpleEErrorSpace: Story = {
  args: {
    viewModel: simple_e_error_space.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const simpleT: Story = {
  args: {
    viewModel: simple_t.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const simpleK: Story = {
  args: {
    viewModel: simple_k.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const SimpleKErrorSimpleJ: Story = {
  args: {
    viewModel: simple_k_error_simple_j.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};
export const simpleRErrorSimpleF: Story = {
  args: {
    viewModel: simple_r_error_simple_f.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const Simple6: Story = {
  args: {
    viewModel: simple_6.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};


export const ShiftF: Story = {
  args: {
    viewModel: shift_f.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};

export const ShiftB: Story = {
  args: {
    viewModel: shift_b.expectedOutput,
    className,
    fingerLayout: fingerLayoutASDF,
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEnQwerty,
  },
};
