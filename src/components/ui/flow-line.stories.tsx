import type { Meta, StoryObj } from '@storybook/react';
import { Geist_Mono } from 'next/font/google';
import { FlowLine } from './flow-line';
import { TypingStream } from '@/interfaces/types';
import { createTypingStream } from '@/lib/stream';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
  decorators: [
    Story => (
      <div className={`${geistMono.variable} font-mono`}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const fullStreamText = 'The quick brown fox jumps over the lazy dog.';

const baseStreamCompleted: TypingStream = fullStreamText.split('').map(char => ({
  targetSymbol: char,
  attempts: [{ typedChar: char, startAt: 0, endAt: 100 }],
}));

const baseStreamPending: TypingStream = createTypingStream(fullStreamText);

export const Default: Story = {
  args: {
    stream: baseStreamCompleted,
    cursorPosition: 10,
  },
};

const streamWithOneError: TypingStream = JSON.parse(JSON.stringify(baseStreamCompleted));
streamWithOneError[4].attempts?.unshift({ typedChar: 'w', startAt: 0, endAt: 50 }); // 1 error on 'q'

export const WithOneError: Story = {
  args: {
    stream: streamWithOneError,
    cursorPosition: 10,
  },
};

const streamWithMultipleErrors: TypingStream = JSON.parse(JSON.stringify(baseStreamCompleted));
streamWithMultipleErrors[4].attempts?.unshift({ typedChar: 'w', startAt: 0, endAt: 50 });
streamWithMultipleErrors[4].attempts?.unshift({ typedChar: 'e', startAt: 50, endAt: 100 }); // 2 errors on 'q'
streamWithMultipleErrors[6].attempts?.unshift({ typedChar: 'w', startAt: 0, endAt: 50 });
streamWithMultipleErrors[6].attempts?.unshift({ typedChar: 'e', startAt: 50, endAt: 100 });
streamWithMultipleErrors[6].attempts?.unshift({ typedChar: 'r', startAt: 100, endAt: 150 }); // 3 errors on 'i'


export const WithMultipleErrors: Story = {
  args: {
    stream: streamWithMultipleErrors,
    cursorPosition: 20,
  },
};

export const AtTheBeginning: Story = {
  args: {
    stream: baseStreamPending, // All characters are pending
    cursorPosition: 0,
  },
};

export const AtTheEnd: Story = {
  args: {
    stream: baseStreamCompleted, // All characters are completed
    cursorPosition: baseStreamCompleted.length -1,
  },
};

