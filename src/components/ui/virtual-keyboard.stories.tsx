import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { KeyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { VirtualKeyboard, type VirtualKeyboardProps } from "./virtual-keyboard";
import { createVirtualLayout } from "@/lib/virtual-layout";

type StoryArgs = VirtualKeyboardProps & { shift: boolean };

const meta = {
  component: VirtualKeyboard,
  argTypes: {
    shift: {
      name: 'Shift Modifier',
      control: 'boolean',
      description: 'Toggle to switch between lower and upper case',
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
