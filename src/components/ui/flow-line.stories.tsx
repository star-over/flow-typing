import type { Meta, StoryObj } from '@storybook/react';
import { Geist, Geist_Mono } from 'next/font/google';

import { FlowLineCursorMode, FlowLineCursorType, FlowLineSize, TypedKey,TypingStream } from '@/interfaces/types';
import { addAttempt,createTypingStream } from '@/lib/stream-utils';
import { getKeyCapIdsForChar, isShiftRequired } from '@/lib/symbol-utils';

import { FlowLine } from './flow-line';

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

// --- Helper to create TypedKey from a character ---
const createTypedKeyFromChar = (char: string, isCorrect: boolean): TypedKey | null => {
  const keyCapIds = getKeyCapIdsForChar(char);
  if (!keyCapIds) return null;
  const primaryKey = keyCapIds.find(id => !id.includes('Shift')) || keyCapIds[0];
  return {
    keyCapId: primaryKey,
    shift: isShiftRequired(char),
    isCorrect,
  };
};


// --- Stream Definitions ---

// 1. A stream with no attempts yet
const baseStreamPending: TypingStream = createTypingStream(fullStreamText);

// 2. A stream where every character was typed correctly on the first attempt
let baseStreamCompleted = createTypingStream(fullStreamText);
for (let i = 0; i < baseStreamCompleted.length; i++) {
  const targetChar = baseStreamCompleted[i].targetSymbol;
  const typedKey = createTypedKeyFromChar(targetChar, true);
  if (typedKey) {
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
  const targetChar = streamWithOneError[i].targetSymbol;
  const correctTypedKey = createTypedKeyFromChar(targetChar, true)!;

  if (i === 4) { // Incorrect attempt on 'q'
    const wrongTypedKey = createTypedKeyFromChar('w', false);
    if (wrongTypedKey) {
      streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, typedKey: wrongTypedKey, startAt: 0, endAt: 50 });
    }
  }
  // Final correct attempt for all characters
  streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, typedKey: correctTypedKey, startAt: 50, endAt: 100 })
}

// 4. A stream with multiple errors on 'q' (index 4) and 'i' (index 6)
let streamWithMultipleErrors = createTypingStream(fullStreamText);
for (let i = 0; i < streamWithMultipleErrors.length; i++) {
  const targetChar = streamWithMultipleErrors[i].targetSymbol;
  const correctTypedKey = createTypedKeyFromChar(targetChar, true)!;

  if (i === 0) { // Errors on 'T'
    const wrongTypedKey = createTypedKeyFromChar('w', false);
    if (wrongTypedKey) {
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedKey: wrongTypedKey, startAt: 0, endAt: 50 });
    }
  } else if (i === 1) { // Errors on 'h'
    const wrongTypedKey1 = createTypedKeyFromChar('w', false);
    const wrongTypedKey2 = createTypedKeyFromChar('e', false);
    if (wrongTypedKey1 && wrongTypedKey2) {
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedKey: wrongTypedKey1, startAt: 0, endAt: 50 });
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, typedKey: wrongTypedKey2, startAt: 50, endAt: 100 });
    }
  } else if (i === 2) { // Errors on 'e'
    const wrongTypedKey1 = createTypedKeyFromChar('a', false);
    const wrongTypedKey2 = createTypedKeyFromChar('b', false);
    const wrongTypedKey3 = createTypedKeyFromChar('c', false);
    if (wrongTypedKey1 && wrongTypedKey2 && wrongTypedKey3) {
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
