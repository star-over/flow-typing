import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Geist, Geist_Mono } from 'next/font/google';

import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { keyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { ModifierKey } from "@/interfaces/types";
import { createVirtualLayout, findPath } from "@/lib/virtual-layout";

import { VirtualKeyboard, type VirtualKeyboardProps } from "./virtual-keyboard";

type StoryArgs = VirtualKeyboardProps & { activeModifiers: ModifierKey[], target: string };

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const meta  = {
  title: 'UI/VirtualKeyboard',
  component: VirtualKeyboard,
  argTypes: {
    activeModifiers: {
      name: 'Active Modifiers',
      control: 'check',
      options: ['shift', 'ctrl', 'alt', 'meta'],
      description: 'Select active modifier keys.',
    },
    target: {
      name: 'Target symbol',
      options: ["Q", "Z", "S", "3", "F", "G", "6", "y", "m", ",", "-", "]", "=", ".", "/"],
      control: "inline-radio",
      description: 'Target symbol than need to be reached by user',
    },
    virtualLayout: {
      control: false,
    },
  },
  decorators: [
    Story => (
      <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const WholeKeyboard: Story = {
  args: {
    activeModifiers: [],
  },
  render: ({ activeModifiers }) => {
    const virtualLayout = createVirtualLayout({
      keyboardLayout: keyboardLayoutANSI,
      symbolLayout: symbolLayoutEnQwerty,
      fingerLayout: fingerLayoutASDF,
      activeModifiers: activeModifiers,
    });

    return <VirtualKeyboard  {...{ virtualLayout, activeModifiers }} />;
  },
};

export const JustPath: Story = {
  args: {
    target: meta.argTypes.target.options[0],
  },
  render: ({ target }) => {
    const virtualLayout = findPath({
      keyboardLayout: keyboardLayoutANSI,
      symbolLayout: symbolLayoutEnQwerty,
      fingerLayout: fingerLayoutASDF,
      targetSymbol: target,
    });

    return <VirtualKeyboard virtualLayout={virtualLayout} />;
  },
};
