import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Geist, Geist_Mono } from 'next/font/google';

import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { keyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en";
import { symbolLayoutRu } from "@/data/symbol-layout-ru";
import { createVirtualLayout } from "@/lib/virtual-layout";

import { VirtualKeyboard, type VirtualKeyboardProps } from "./virtual-keyboard";

type StoryArgs = VirtualKeyboardProps;

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const meta = {
  title: 'UI/VirtualKeyboard',
  component: VirtualKeyboard,
  argTypes: {
    virtualLayout: {
      control: false,
    },
  },
  decorators: [
    (Story) => (
      <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const WholeKeyboard: Story = {
  render: () => {
    const virtualLayout = createVirtualLayout({
      keyboardLayout: keyboardLayoutANSI,
      symbolLayout: symbolLayoutEnQwerty,
      fingerLayout: fingerLayoutASDF,
    });

    return <VirtualKeyboard {...{ virtualLayout, keyboardLayout: keyboardLayoutANSI, symbolLayout: symbolLayoutEnQwerty }} />;
  },
};

export const CyrillicKeyboard: Story = {
  render: () => {
    const virtualLayout = createVirtualLayout({
      keyboardLayout: keyboardLayoutANSI,
      symbolLayout: symbolLayoutRu, // Use Cyrillic layout
      fingerLayout: fingerLayoutASDF,
    });

    return <VirtualKeyboard {...{ virtualLayout, keyboardLayout: keyboardLayoutANSI, symbolLayout: symbolLayoutRu }} />;
  },
};
