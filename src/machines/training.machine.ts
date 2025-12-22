import { createMachine, assign } from 'xstate';
import { KeyCapId } from '@/interfaces/key-cap-id';
import { FingerId, TypingStream } from '@/interfaces/types';
import { getFingerByKeyCap, getKeyCapIdsForChar, isShiftRequired } from '@/lib/symbol-utils';
import { fingerLayoutASDF } from '@/data/finger-layout-asdf';

// Forward-declare event and context types for type safety
interface TrainingContext {
  stream: TypingStream;
  currentIndex: number;
  pressedKey: string | null;
  errors: number;
  targetKeyCapId: KeyCapId | undefined;
  targetFingerId: FingerId | undefined;
  shiftRequired: boolean;
}

type TrainingEvent =
  | { type: 'KEY_PRESS'; key: string }
  | { type: 'PAUSE_TRAINING' }
  | { type: 'RESUME_TRAINING' };

export const trainingMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBcBOBDAlgOx1AxAAoCCAqgMoCiA+gCoBKxAkgHKsDiA2gAwC6ioAA4B7WJmSZh2ASAAeiALQAOAHRKAjAHZuAFgCs3dQE4T6nZr0AaEAE9EmnSoBsSnUqPc9SpwCZPTgF8A6zQsXGwoFRxxTHQAG0wALzwAGThYKXwefiQQETEJKRl5BHUnJxV1AwBmPU0fKtrPTWs7BB0K+vqyn3L1Hz1qoyCQjGiIlXQAdywJCKZsQQBXZHwAaUoATWpCekpycmyZfJii3JLax24lat6jIaUlH2qlVsR1MpUagZM3bhNDCMQKFxpFBKhhABjdJ4BbLVZHXInQrSc6IapObjODR1J5OIYWFq2RA+DzOHQvPQ+TRGTT1DRAkHhMEQ6GwMTzRYrLLqHJCUSnVGgEo6Ewqf7VTxmTROPR1HxvBCkrFOClKKk0uk+JSMsbMlSQ4SoVBgSHIOHcxH8gqSIVydGY7FVTR4gl1RVuaoqIx+PT9BpGPRGfS6sJ4A1Gk1mi0I3nHAUo4rvMkdJw02pGVWk7Uem7e33+4xBkPBYF68M4Q3G03mrkIvjxm1nYWIbQVdTuHQfdTVMpOfqKgMqHw6bgj-SkzM6Hyh0EqQToJawSD4PbkUgAWRoDGYbBYXAbSITtqTCFu7Y+vS7Tx7N0VCgc2LcHi8vn8QVL2GEEDgMiZeEbQVTwUPQKg0bR9EMEwjGlKxiQQBQehUaoHlqapRRg6lqlnfVogkeIklSdJmzyY8SJKBQKnPDRPF7XQ5TTQd1BUcwjCeTxRQ+QxsNLf8JmmWZYTrQDEzRM83C+MpvDTa4NG8D1HE7QYJ3xG4KRw8NwShGFOXhESTzElCjEqVVVRlKlA3VQdSW9Yx3DfGD6i8DSJirKNaz0o8mztC59GcWl1XUbgZXcdxFQxHwvgpVUtDpNxRRcyJK0jGsY308jEBcPQnTqIYBkedRB1VclILynt3148sJgXJdIHSnySW4L0-BlFxgonHQdHvCxxTKH0Oz9B5p0SlQ4mI7AAGFhAAW0EMbkDAerT1uZjfXKEdQJa9DFTlLE3FcOLvC0KoPwCIA */
  id: 'training',
  initial: 'awaitingInput',
  types: {} as {
    context: TrainingContext;
    events: TrainingEvent;
    input: { stream: TypingStream };
  },
  context: ({ input }) => ({
    stream: input.stream,
    currentIndex: 0,
    pressedKey: null,
    errors: 0,
    targetKeyCapId: undefined,
    targetFingerId: undefined,
    shiftRequired: false,
  }),
  on: {
    PAUSE_TRAINING: '.paused',
  },
  states: {
    awaitingInput: {
      entry: assign({
        // Calculate and assign the target IDs when entering this state
        targetKeyCapId: ({ context }) => {
          const symbol = context.stream[context.currentIndex]?.targetSymbol;
          if (!symbol) return undefined;
          const keyCapIds = getKeyCapIdsForChar(symbol);
          return keyCapIds?.find(id => !id.includes('Shift')) || keyCapIds?.[0];
        },
        targetFingerId: ({ context }) => {
          const symbol = context.stream[context.currentIndex]?.targetSymbol;
          if (!symbol) return undefined;
          const keyCapIds = getKeyCapIdsForChar(symbol);
          const keyCapId = keyCapIds?.find(id => !id.includes('Shift')) || keyCapIds?.[0];
          if (!keyCapId) return undefined;
          return getFingerByKeyCap(keyCapId, fingerLayoutASDF);
        },
        shiftRequired: ({ context }) => {
          const symbol = context.stream[context.currentIndex]?.targetSymbol;
          if (!symbol) return false;
          return isShiftRequired(symbol);
        },
      }),
      on: {
        KEY_PRESS: {
          target: 'processingInput',
          actions: assign({
            pressedKey: ({ event }) => event.key,
          }),
        },
      },
    },
    processingInput: {
      always: [
        {
          target: 'correctInput',
          guard: ({ context }) => {
            const currentSymbol = context.stream[context.currentIndex]?.targetSymbol;
            return context.pressedKey === currentSymbol;
          },
        },
        { target: 'incorrectInput' },
      ],
    },
    correctInput: {
      entry: assign({
        currentIndex: ({ context }) => context.currentIndex + 1,
      }),
      always: [
        {
          target: 'lessonComplete',
          guard: ({ context }) => context.currentIndex >= context.stream.length,
        },
        { target: 'awaitingInput' },
      ],
    },
    incorrectInput: {
      entry: assign({
        errors: ({ context }) => context.errors + 1,
      }),
      always: 'awaitingInput',
    },
    paused: {
      on: {
        RESUME_TRAINING: 'awaitingInput',
      },
    },
    lessonComplete: {
      type: 'final',
    },
  },
});
