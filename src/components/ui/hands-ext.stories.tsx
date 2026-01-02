import type { Meta, StoryObj } from '@storybook/react';

// Убран импорт HandStates, так как он больше не используется напрямую в props
import { HandsExt } from './hands-ext';

const meta = {
  title: 'UI/HandsExt',
  component: HandsExt,
  parameters: {
    layout: 'fullscreen',
  },

} satisfies Meta<typeof HandsExt>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock hand states for demonstration
// Теперь эти состояния будут spread'иться напрямую в args
const mockHandStates = {
  L5: "IDLE",
  L4: "IDLE",
  L3: "IDLE",
  L2: "IDLE",
  L1: "IDLE",
  R1: "IDLE",
  R2: "IDLE",
  R3: "IDLE",
  R4: "IDLE",
  R5: "IDLE",
  LB: "IDLE",
  RB: "IDLE",
} as const; // Используем as const для сохранения точных строковых литералов

export const Default: Story = {
  args: {
    highlightedFingerKeys: {},
    ...mockHandStates, // Распространяем состояния пальцев напрямую
  },
};

export const ShiftFCombination: Story = {
  args: {
    highlightedFingerKeys: {
      L2: ['KeyF'], // Left Index finger presses 'F'
      R5: ['ShiftRight'], // Right Pinky presses 'ShiftRight'
    },
    ...mockHandStates, // Начинаем с состояний по умолчанию
    L2: "ACTIVE", // Переопределяем конкретные состояния
    R5: "ACTIVE",
  },
};

export const SingleKeyPress: Story = {
  args: {
    highlightedFingerKeys: {
      L2: ['KeyA'], // Left Index finger presses 'A'
    },
    ...mockHandStates, // Начинаем с состояний по умолчанию
    L2: "ACTIVE", // Переопределяем конкретное состояние
  },
};

// You can add more stories for different combinations
