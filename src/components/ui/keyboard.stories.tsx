import type { Meta, StoryObj } from '@storybook/nextjs-vite';


import { PhysicalKeyboardANSI } from "@/data/physical-keyboard-ansi";
import { fingerZonesASDF } from "@/data/fingers-zones-asdf";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout";
import { Keyboard } from "./keyboard";

const meta = {
  component: Keyboard,
} satisfies Meta<typeof Keyboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    physicalKeyboard: PhysicalKeyboardANSI,
    fingerZones: fingerZonesASDF,
    symbolLayout: symbolLayoutEnQwerty,
  }
};
