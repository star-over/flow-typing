import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { keyboard } from './keyboard';

const meta = {
  component: keyboard,
} satisfies Meta<typeof keyboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    physicalKeyboard: {},
    fingerZones: {},
    symbolLayout: {}
  }
};