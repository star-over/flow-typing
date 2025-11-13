import type { Meta, StoryObj } from '@storybook/react';
import { FlowLine } from './flow-line';
import { TypingStream } from '@/interfaces/types';

const meta: Meta<typeof FlowLine> = {
  title: 'UI/FlowLine',
  component: FlowLine,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    cursorPosition: { control: { type: 'number', min: 0 } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseStream: TypingStream = 'The quick brown fox jumps over the lazy dog.'.split('').map(char => ({
  targetSymbol: char,
  attempts: [{ typedChar: char, timestamp: 0 }],
}));

export const Default: Story = {
  args: {
    stream: baseStream,
    cursorPosition: 10,
  },
};

const streamWithOneError: TypingStream = JSON.parse(JSON.stringify(baseStream));
streamWithOneError[4].attempts.unshift({ typedChar: 'w', timestamp: 0 }); // 1 error on 'q'

export const WithOneError: Story = {
  args: {
    stream: streamWithOneError,
    cursorPosition: 10,
  },
};

const streamWithMultipleErrors: TypingStream = JSON.parse(JSON.stringify(baseStream));
streamWithMultipleErrors[4].attempts.unshift({ typedChar: 'w', timestamp: 0 });
streamWithMultipleErrors[4].attempts.unshift({ typedChar: 'e', timestamp: 0 }); // 2 errors on 'q'
streamWithMultipleErrors[6].attempts.unshift({ typedChar: 'w', timestamp: 0 });
streamWithMultipleErrors[6].attempts.unshift({ typedChar: 'e', timestamp: 0 });
streamWithMultipleErrors[6].attempts.unshift({ typedChar: 'r', timestamp: 0 }); // 3 errors on 'i'


export const WithMultipleErrors: Story = {
  args: {
    stream: streamWithMultipleErrors,
    cursorPosition: 20,
  },
};

export const AtTheBeginning: Story = {
  args: {
    stream: baseStream,
    cursorPosition: 0,
  },
};

export const AtTheEnd: Story = {
  args: {
    stream: baseStream,
    cursorPosition: baseStream.length -1,
  },
};

