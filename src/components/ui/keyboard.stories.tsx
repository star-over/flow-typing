import type { Meta, StoryObj } from '@storybook/nextjs-vite';


import { KeyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-row";
import { Keyboard } from "./keyboard";

const meta = {
  component: Keyboard,
} satisfies Meta<typeof Keyboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    physicalKeyboard: KeyboardLayoutANSI,
    fingerLayout: fingerLayoutASDF,
    symbolLayout: symbolLayoutEnQwerty,
  }
};
