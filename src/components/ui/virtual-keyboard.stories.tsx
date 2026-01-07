import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Geist, Geist_Mono } from 'next/font/google';

import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { keyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { ModifierKey } from "@/interfaces/types";
import { createVirtualLayout } from "@/lib/virtual-layout";

import { VirtualKeyboard, type VirtualKeyboardProps } from "./virtual-keyboard";

type StoryArgs = VirtualKeyboardProps & { activeModifiers: ModifierKey[] };

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
