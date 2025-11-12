import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { KeyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { VirtualKeyboard, type VirtualKeyboardProps } from "./virtual-keyboard";
import { createVirtualLayout, findPath } from "@/lib/virtual-layout";

type StoryArgs = VirtualKeyboardProps & { shift: boolean, target: string };

const meta = {
  component: VirtualKeyboard,
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
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Interactive: Story = {
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

export const Interactive2: Story = {
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
