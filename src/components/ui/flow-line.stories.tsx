import type { Meta, StoryObj } from '@storybook/react';
import { Geist, Geist_Mono } from 'next/font/google';
import { FlowLine } from './flow-line';
import { FlowLineCursorMode, FlowLineCursorType, FlowLineSize, TypingStream } from '@/interfaces/types';
import { createTypingStream, addAttempt } from '@/lib/stream-utils';
import { getSymbolKeyForChar } from '@/lib/symbol-utils';

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
    className: { control: false },
    cursorPosition: { control: { type: 'number', min: 0 } },
    cursorType: {
      options: ["VERTICAL", "UNDERSCORE", "RECTANGLE"] satisfies FlowLineCursorType[],
      control: "inline-radio",
    },
    size: {
      options: ["XS", "SM", "MD", "LG", "XL"] satisfies FlowLineSize[],
      control: "inline-radio",
    },
    cursorMode: {
      options: ["HALF", "THIRD", "QUARTER", "DINAMIC"] satisfies FlowLineCursorMode[],
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
for (let i = 0; i < baseStreamCompleted.length; i++) {
  const symbolKey = baseStreamCompleted[i].targetSymbol;
  const typedKey = { keyCapId: symbolKey.keyCapId, shift: symbolKey.shift, isCorrect: true };
  if (typedKey) { // This check is mostly for TypeScript, as getSymbolKeyForChar always returns a SymbolKey
    baseStreamCompleted = addAttempt({
      stream: baseStreamCompleted,
      cursorPosition: i,
      typedKey: typedKey,
      startAt: 0,
      endAt: 100,
    });
  }
}

// 3. A stream with one error on 'q' (index 4)
let streamWithOneError = createTypingStream(fullStreamText);
for (let i = 0; i < streamWithOneError.length; i++) {
  const targetSymbolKey = streamWithOneError[i].targetSymbol;
  const correctTypedKey = { keyCapId: targetSymbolKey.keyCapId, shift: targetSymbolKey.shift, isCorrect: true };

  if (i === 4) { // Incorrect attempt on 'q'
    const wrongSymbolKey = getSymbolKeyForChar('w');
    if (wrongSymbolKey) {
      const wrongTypedKey = { keyCapId: wrongSymbolKey.keyCapId, shift: wrongSymbolKey.shift, isCorrect: false };
      streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, typedKey: wrongTypedKey, startAt: 0, endAt: 50 });
    }
  }
  // Final correct attempt for all characters
  streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, typedKey: correctTypedKey, startAt: 50, endAt: 100 })
}

// 4. A stream with multiple errors on 'q' (index 4) and 'i' (index 6)
let streamWithMultipleErrors = createTypingStream(fullStreamText);
for (let i = 0; i < streamWithMultipleErrors.length; i++) {
  const targetSymbolKey = streamWithMultipleErrors[i].targetSymbol;
  const correctTypedKey = { keyCapId: targetSymbolKey.keyCapId, shift: targetSymbolKey.shift, isCorrect: true };

  if (i === 0) { // Errors on 'T'
    const wrongSymbolKey = getSymbolKeyForChar('w');
    if (wrongSymbolKey) {
      const wrongTypedKey = { keyCapId: wrongSymbolKey.keyCapId, shift: wrongSymbolKey.shift, isCorrect: false };
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedKey: wrongTypedKey, startAt: 0, endAt: 50 });
    }
  } else if (i === 1) { // Errors on 'h'
    const wrongSymbolKey1 = getSymbolKeyForChar('w');
    const wrongSymbolKey2 = getSymbolKeyForChar('e');
    if (wrongSymbolKey1 && wrongSymbolKey2) {
      const wrongTypedKey1 = { keyCapId: wrongSymbolKey1.keyCapId, shift: wrongSymbolKey1.shift, isCorrect: false };
      const wrongTypedKey2 = { keyCapId: wrongSymbolKey2.keyCapId, shift: wrongSymbolKey2.shift, isCorrect: false };
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedKey: wrongTypedKey1, startAt: 0, endAt: 50 });
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedKey: wrongTypedKey2, startAt: 50, endAt: 100 });
    }
  } else if (i === 2) { // Errors on 'e'
    const wrongSymbolKey1 = getSymbolKeyForChar('a');
    const wrongSymbolKey2 = getSymbolKeyForChar('b');
    const wrongSymbolKey3 = getSymbolKeyForChar('c');
    if (wrongSymbolKey1 && wrongSymbolKey2 && wrongSymbolKey3) {
      const wrongTypedKey1 = { keyCapId: wrongSymbolKey1.keyCapId, shift: wrongSymbolKey1.shift, isCorrect: false };
      const wrongTypedKey2 = { keyCapId: wrongSymbolKey2.keyCapId, shift: wrongSymbolKey2.shift, isCorrect: false };
      const wrongTypedKey3 = { keyCapId: wrongSymbolKey3.keyCapId, shift: wrongSymbolKey3.shift, isCorrect: false };
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedKey: wrongTypedKey1, startAt: 0, endAt: 50 });
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedKey: wrongTypedKey2, startAt: 50, endAt: 100 });
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedKey: wrongTypedKey3, startAt: 100, endAt: 150 });
    }
  }
  // Final correct attempt for all characters
  streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedKey: correctTypedKey, startAt: 50, endAt: 100 })
}

export const Default: Story = {
  args: {
    cursorPosition: 0,
    size: meta.argTypes.size.options[0],
    cursorMode: meta.argTypes.cursorMode.options[0],
    cursorType: meta.argTypes.cursorType.options[0],
    stream: baseStreamPending,
  },
};

export const WithOneError: Story = {
  args: {
    cursorPosition: 10,
    size: meta.argTypes.size.options[0],
    cursorMode: meta.argTypes.cursorMode.options[0],
    cursorType: meta.argTypes.cursorType.options[0],
    stream: streamWithOneError,
  },
};

export const WithMultipleErrors: Story = {
  args: {
    cursorPosition: 10,
    size: meta.argTypes.size.options[0],
    cursorMode: meta.argTypes.cursorMode.options[0],
    cursorType: meta.argTypes.cursorType.options[0],
    stream: streamWithMultipleErrors,
  },
};
