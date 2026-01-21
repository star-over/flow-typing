import type { Meta, StoryObj } from '@storybook/react';
import { Geist, Geist_Mono } from 'next/font/google';

import { symbolLayoutEnQwerty } from '@/data/symbol-layout-ru';
import {
  FLOW_LINE_CURSOR_MODES,
  FLOW_LINE_CURSOR_TYPES,
  FLOW_LINE_SIZES,
  KEY_CAP_PRESS_RESULTS,
  KeyCapId,
  TypingStream
} from '@/interfaces/types';
import { addAttempt,createTypingStream } from '@/lib/stream-utils';
import { getKeyCapIdsForChar } from '@/lib/symbol-utils';

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
    cursorPosition: {
      control: { type: 'number', min: 0 }
    },
    cursorType: {
      options: FLOW_LINE_CURSOR_TYPES,
      control: "inline-radio",
    },
    size: {
      options: FLOW_LINE_SIZES,
      control: "inline-radio",
    },
    pressResult: {
      options: KEY_CAP_PRESS_RESULTS,
      control: "inline-radio"
    },
    cursorMode: {
      options: FLOW_LINE_CURSOR_MODES,
      control: "inline-radio",
    },
  },
  decorators: [
    (Story) => (
      <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FlowLine>;

export default meta;
type Story = StoryObj<typeof meta>;

const fullStreamText = 'The Quick brown fo xxx xxx xxx xxx xxx jumps over the lazy dog.';

// --- Helper to create KeyCapId[] from a character ---
const createPressedKeyCupsFromChar = (char: string): KeyCapId[] | null => {
  const keyCapIds = getKeyCapIdsForChar(char, symbolLayoutEnQwerty);
  if (!keyCapIds) return null;
  return keyCapIds;
};


// --- Stream Definitions ---

// 1. A stream with no attempts yet
const baseStreamPending: TypingStream = createTypingStream(fullStreamText);

// 2. A stream where every character was typed correctly on the first attempt
let baseStreamCompleted = createTypingStream(fullStreamText);
for (let i = 0; i < baseStreamCompleted.length; i++) {
  const targetChar = baseStreamCompleted[i].targetSymbol;
  const pressedKeyCups = createPressedKeyCupsFromChar(targetChar); // Use new function
  if (pressedKeyCups) {
    baseStreamCompleted = addAttempt({
      stream: baseStreamCompleted,
      cursorPosition: i,
      pressedKeyCups: pressedKeyCups, // Use new parameter name
      startAt: 0,
      endAt: 100,
    });
  }
}

// 3. A stream with one error on 'q' (index 4)
let streamWithOneError = createTypingStream(fullStreamText);
for (let i = 0; i < streamWithOneError.length; i++) {
  const targetChar = streamWithOneError[i].targetSymbol;
  const correctPressedKeyCups = createPressedKeyCupsFromChar(targetChar)!; // Use new function and variable name

  if (i === 4) { // Incorrect attempt on 'q'
    const wrongPressedKeyCups = createPressedKeyCupsFromChar('w'); // Use new function and variable name
    if (wrongPressedKeyCups) {
      streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, pressedKeyCups: wrongPressedKeyCups, startAt: 0, endAt: 50 }); // Use new parameter name
    }
  }
  // Final correct attempt for all characters
  streamWithOneError = addAttempt({ stream: streamWithOneError, cursorPosition: i, pressedKeyCups: correctPressedKeyCups, startAt: 50, endAt: 100 }) // Use new parameter name
}

// 4. A stream with multiple errors on 'q' (index 4) and 'i' (index 6)
let streamWithMultipleErrors = createTypingStream(fullStreamText);
for (let i = 0; i < streamWithMultipleErrors.length; i++) {
  const targetChar = streamWithMultipleErrors[i].targetSymbol;
  const correctPressedKeyCups = createPressedKeyCupsFromChar(targetChar)!;

  if (i === 0) { // Errors on 'T'
    const wrongPressedKeyCups = createPressedKeyCupsFromChar('w');
    if (wrongPressedKeyCups) {
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCups: wrongPressedKeyCups, startAt: 0, endAt: 50 });
    }
  } else if (i === 1) { // Errors on 'h'
    const wrongPressedKeyCups1 = createPressedKeyCupsFromChar('w');
    const wrongPressedKeyCups2 = createPressedKeyCupsFromChar('e');
    if (wrongPressedKeyCups1 && wrongPressedKeyCups2) {
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCups: wrongPressedKeyCups1, startAt: 0, endAt: 50 });
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCups: wrongPressedKeyCups2, startAt: 50, endAt: 100 });
    }
  } else if (i === 2) { // Errors on 'e'
    const wrongPressedKeyCups1 = createPressedKeyCupsFromChar('a');
    const wrongPressedKeyCups2 = createPressedKeyCupsFromChar('b');
    const wrongPressedKeyCups3 = createPressedKeyCupsFromChar('c');
    if (wrongPressedKeyCups1 && wrongPressedKeyCups2 && wrongPressedKeyCups3) {
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCups: wrongPressedKeyCups1, startAt: 0, endAt: 50 });
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCups: wrongPressedKeyCups2, startAt: 50, endAt: 100 });
      streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCups: wrongPressedKeyCups3, startAt: 100, endAt: 150 });
    }
  }
  // Final correct attempt for all characters
  streamWithMultipleErrors = addAttempt({ stream: streamWithMultipleErrors, cursorPosition: i, pressedKeyCups: correctPressedKeyCups, startAt: 50, endAt: 100 })
}

export const Default: Story = {
  args: {
    cursorPosition: 0,
    size: meta.argTypes.size.options[0],
    cursorMode: meta.argTypes.cursorMode.options[0],
    cursorType: meta.argTypes.cursorType.options[0],
    pressResult: meta.argTypes.pressResult.options[0],
    stream: baseStreamPending,
  },
};

export const BaseStreamCompleted: Story = {
  args: {
    cursorPosition: 20,
    size: meta.argTypes.size.options[0],
    cursorMode: meta.argTypes.cursorMode.options[0],
    cursorType: meta.argTypes.cursorType.options[0],
    pressResult: meta.argTypes.pressResult.options[0],
    stream: streamWithOneError,
  },
};

export const WithOneError: Story = {
  args: {
    cursorPosition: 10,
    size: meta.argTypes.size.options[0],
    cursorMode: meta.argTypes.cursorMode.options[0],
    cursorType: meta.argTypes.cursorType.options[0],
    pressResult: meta.argTypes.pressResult.options[0],
    stream: streamWithOneError,
  },
};

export const WithMultipleErrors: Story = {
  args: {
    cursorPosition: 10,
    size: meta.argTypes.size.options[0],
    cursorMode: meta.argTypes.cursorMode.options[0],
    cursorType: meta.argTypes.cursorType.options[0],
    pressResult: meta.argTypes.pressResult.options[0],
    stream: streamWithMultipleErrors,
  },
};
