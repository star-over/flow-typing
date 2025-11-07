import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { keyboard } from './keyboard';
import { PhysicalKeyboardANSI } from "@/data/physical-keyboard-ansi";
import { fingerZonesASDF } from "@/data/fingers-zones-asdf";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout";

const meta = {
  component: keyboard,
} satisfies Meta<typeof keyboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    physicalKeyboard: PhysicalKeyboardANSI,
    fingerZones: fingerZonesASDF,
    symbolLayout: symbolLayoutEnQwerty,
  }
};
