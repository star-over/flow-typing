import type { Meta, StoryObj } from '@storybook/nextjs-vite';


import { KeyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { VirtualKeyboard } from "./virtual-keyboard";
import { createVirtualLayout } from "@/lib/virtual-layout";

const meta = {
  component: VirtualKeyboard,
} satisfies Meta<typeof VirtualKeyboard>;

export default meta;

type Story = StoryObj<typeof meta>;

const virtualLayout = createVirtualLayout({
  keyboardLayout: KeyboardLayoutANSI,
  symbolLayout: symbolLayoutEnQwerty,
  fingerLayout: fingerLayoutASDF,
});

const virtualLayoutCaps = createVirtualLayout({
  keyboardLayout: KeyboardLayoutANSI,
  symbolLayout: symbolLayoutEnQwerty,
  fingerLayout: fingerLayoutASDF,
  shift: true,
})

export const LowerCase: Story = {
  args: {
    virtualLayout,
  }
};

export const UpperCase: Story = {
  args: {
    virtualLayout: virtualLayoutCaps,
  }
};
