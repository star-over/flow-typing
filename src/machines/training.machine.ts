/**
 * @file Машина состояний XState для управления процессом тренировки слепой печати.
 * @description Эта машина управляет потоком упражнения, обрабатывает ввод пользователя,
 * отслеживает ошибки и прогресс, а также управляет визуальным состоянием
 * целевых клавиш и пальцев.
 */
import { assign,createMachine } from 'xstate';

import { KeyCapId, TypingStream } from '@/interfaces/types';


export interface TrainingContext {
  stream: TypingStream;
  currentIndex: number;
  pressedKeys: KeyCapId[] | null;
  errors: number;
}

export type TrainingEvent =
  | { type: 'KEY_PRESS'; keys: KeyCapId[] }
  | { type: 'PAUSE_TRAINING' }
  | { type: 'RESUME_TRAINING' };


/**
 * XState машина состояний для управления логикой тренировки.
 * @returns Инстанс XState машины тренировки.
 */
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
    pressedKeys: null,
    errors: 0,
  }),
  on: {
    PAUSE_TRAINING: '.paused',
  },
  states: {
    awaitingInput: {
      on: {
        KEY_PRESS: {
          target: 'processingInput',
          actions: assign({
            pressedKeys: ({ event }) => event.keys,
          }),
        },
      },
    },
    processingInput: {
      always: [
        {
          target: 'correctInput',
          guard: ({ context, event }) => {
            if (event.type !== 'KEY_PRESS') return false;
            const currentSymbol = context.stream[context.currentIndex];
            if (!currentSymbol) return false;

            const requiredKeys = new Set(currentSymbol.requiredKeyCapIds);
            const keysToCheck = new Set(event.keys);

            // Now, perform a single, universal comparison.
            if (requiredKeys.size !== keysToCheck.size) return false;
            for (const key of requiredKeys) {
              if (!keysToCheck.has(key)) return false;
            }
            return true;
          },
        },
        { target: 'incorrectInput' },
      ],
    },
    correctInput: {
      entry: assign({
        stream: ({ context }) => {
          const newStream = [...context.stream];
          const currentSymbol = newStream[context.currentIndex];
          const newAttempt = {
            // Faking timestamp for now as it's not critical for this feature
            typedKey: { keyCapId: context.pressedKeys![0], shift: false, isCorrect: true },
            startAt: Date.now(),
            endAt: Date.now(),
          };
          const updatedSymbol = {
            ...currentSymbol,
            attempts: [...currentSymbol.attempts, newAttempt],
          };
          newStream[context.currentIndex] = updatedSymbol;
          return newStream;
        },
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
        stream: ({ context }) => {
          const newStream = [...context.stream];
          const currentSymbol = newStream[context.currentIndex];
          const newAttempt = {
            // Faking timestamp for now as it's not critical for this feature
            typedKey: { keyCapId: context.pressedKeys![0], shift: false, isCorrect: false },
            startAt: Date.now(),
            endAt: Date.now(),
          };
          const updatedSymbol = {
            ...currentSymbol,
            attempts: [...currentSymbol.attempts, newAttempt],
          };
          newStream[context.currentIndex] = updatedSymbol;
          return newStream;
        },
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