import type { Meta, StoryObj } from '@storybook/react';
import { Geist, Geist_Mono } from 'next/font/google';
import { FlowLine } from './flow-line';
import { FlowLineCursorType, TypingStream } from '@/interfaces/types';
import { createTypingStream, addAttempt } from '@/lib/stream';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const meta = {
  title: 'UI/FlowLine',
  component: FlowLine,
  // parameters: {
  //   layout: 'centered',
  // },
  // tags: ['autodocs'],
  argTypes: {
    stream: { control: false },
    cursorPosition: { control: { type: 'number', min: 0 } },
    cursorType: {
      options: ["VERTICAL", "UNDERSCORE", "RECTANGLE"] satisfies FlowLineCursorType[],
      control: "inline-radio",
    },
  },
  decorators: [
    Story => (
      <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FlowLine>;

export default meta;
type Story = StoryObj<typeof meta>;

const fullStreamText = 'The quick brown fo xxx xxx xxx xxx xxx jumps over the lazy dog.';

// --- Stream Definitions ---

// 1. A stream with no attempts yet
const baseStreamPending: TypingStream = createTypingStream(fullStreamText);

// 2. A stream where every character was typed correctly on the first attempt
let baseStreamCompleted = createTypingStream(fullStreamText);
for (let i = 0; i < fullStreamText.length; i++) {
  baseStreamCompleted = addAttempt({
    stream: baseStreamCompleted,
    cursorPosition: i,
    typedSymbol: fullStreamText[i],
    startAt: 0,
    endAt: 100,
  });
}

// 3. A stream with one error on 'q' (index 4)
let streamWithOneError = createTypingStream(fullStreamText);
for (let i = 0; i < fullStreamText.length; i++) {
  if (i === 4) { // Incorrect attempt on 'q'
    streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, typedSymbol: 'w', startAt: 0, endAt: 50 });
  } else {
    // Final correct attempt for all characters
    streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, typedSymbol: fullStreamText[i], startAt: 50, endAt: 100 })
  }
}

// 4. A stream with multiple errors on 'q' (index 4) and 'i' (index 6)
let streamWithMultipleErrors = createTypingStream(fullStreamText);
for (let i = 0; i < fullStreamText.length; i++) {
  if (i === 0) { // Errors on 'q'
    streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedSymbol: 'w', startAt: 0, endAt: 50 });
  } else
  if (i === 1) { // Errors on 'q'
    streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedSymbol: 'w', startAt: 0, endAt: 50 });
    streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedSymbol: 'e', startAt: 50, endAt: 100 });
  } else
  if (i === 2) { // Errors on 'i'
    streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedSymbol: 'a', startAt: 0, endAt: 50 });
    streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedSymbol: 'b', startAt: 50, endAt: 100 });
    streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedSymbol: 'c', startAt: 100, endAt: 150 });
    streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedSymbol: fullStreamText[i], startAt: 150, endAt: 200 })
  } else
  // Final correct attempt for all characters
  streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedSymbol: fullStreamText[i], startAt: 50, endAt: 100 })
}


export const Default: Story = {
  args: {
    stream: baseStreamCompleted,
    cursorPosition: 10,
  },
};

export const WithOneError: Story = {
  args: {
    stream: streamWithOneError,
    cursorPosition: 10,
  },
};

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
    cursorPosition: baseStreamCompleted.length - 1,
    cursorType: meta.argTypes.cursorType.options[0],
  },
};
