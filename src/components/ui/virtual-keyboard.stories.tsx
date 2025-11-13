import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { KeyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { Geist, Geist_Mono } from 'next/font/google';
import { VirtualKeyboard, type VirtualKeyboardProps } from "./virtual-keyboard";
import { createVirtualLayout, findPath } from "@/lib/virtual-layout";

type StoryArgs = VirtualKeyboardProps & { shift: boolean, target: string };

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
  // parameters: {
  //   layout: 'centered',
  // },
  // tags: ['autodocs'],
  argTypes: {
    shift: {
      name: 'Shift Modifier',
      control: 'boolean',
      description: 'Toggle to switch between lower and upper case',
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
    shift: false,
  },
  render: ({ shift }) => {
    const virtualLayout = createVirtualLayout({
      keyboardLayout: KeyboardLayoutANSI,
      symbolLayout: symbolLayoutEnQwerty,
      fingerLayout: fingerLayoutASDF,
      shift: shift,
    });

    return <VirtualKeyboard  {...{ virtualLayout }} />;
  },
};

export const JustPath: Story = {
  args: {
    target: meta.argTypes.target.options[0],
  },
  render: ({ target }) => {

    const targetSymbolKey = findPath({
      keyboardLayout: KeyboardLayoutANSI,
      symbolLayout: symbolLayoutEnQwerty,
      fingerLayout: fingerLayoutASDF,
      targetSymbol: target
    });
    console.log(targetSymbolKey)


    return <VirtualKeyboard virtualLayout={targetSymbolKey} />;
  },
};
