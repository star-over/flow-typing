import type { Meta, StoryObj } from '@storybook/react';
import { FlowLine } from './flow-line';

const meta: Meta<typeof FlowLine> = {
  title: 'UI/FlowLine',
  component: FlowLine,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    stream: { control: 'text' },
    cursorPosition: { control: { type: 'number', min: 0 } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultStream = 'The quick brown fox jumps over the lazy dog.';

export const Default: Story = {
  args: {
    stream: defaultStream,
    cursorPosition: 10,
  },
};

export const AtTheBeginning: Story = {
  args: {
    stream: defaultStream,
    cursorPosition: 0,
  },
};

export const AtTheEnd: Story = {
  args: {
    stream: defaultStream,
    cursorPosition: defaultStream.length - 1,
  },
};

export const WithASpace: Story = {
    args: {
      stream: defaultStream,
      cursorPosition: 3,
    },
  };
