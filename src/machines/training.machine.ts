/**
 * @file Машина состояний XState для управления процессом тренировки слепой печати.
 * @description Эта машина управляет потоком упражнения, обрабатывает ввод пользователя,
 * отслеживает ошибки и прогресс, а также управляет визуальным состоянием
 * целевых клавиш и пальцев.
 */
import { type ActorRefFrom, assign, createMachine, sendTo } from 'xstate';

import { KeyCapId, TypingStream } from '@/interfaces/types';
import { UserPreferences } from '@/interfaces/user-preferences';
import { areKeyCapIdArraysEqual } from '@/lib/symbol-utils';
import { generateTypingStream, lessons } from '@/lib/lesson-generator';
import { getSymbolLayout } from '@/data/layouts';


export interface TrainingContext {
  stream: TypingStream;
  currentIndex: number;
  errors: number;
  keyboardLayout: UserPreferences['keyboardLayout']; // Added to context
  symbolAppearanceTime: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parentActor: ActorRefFrom<any>;
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
  initial: 'generatingLesson',
  types: {} as {
    context: TrainingContext;
    events: TrainingEvent;
    input: {
      keyboardLayout: UserPreferences['keyboardLayout'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parentActor: ActorRefFrom<any>
    };
  },
  context: ({
    input
  }) => ({
    stream: [],
    currentIndex: 0,
    errors: 0,
    keyboardLayout: input.keyboardLayout,
    symbolAppearanceTime: 0,
    parentActor: input.parentActor,
  }),
  on: {
    PAUSE_TRAINING: '.paused',
  },
  states: {
    generatingLesson: {
      entry: assign({
        stream: ({
          context
        }) => { // Access keyboardLayout from context
          const symbolLayout = getSymbolLayout(context.keyboardLayout);
          const randomIndex = Math.floor(Math.random() * lessons.length);
          const lessonText = lessons[randomIndex];
          return generateTypingStream(lessonText, symbolLayout);
        },
      }),
      always: 'awaitingInput',
    },
    awaitingInput: {
      entry: assign({
        symbolAppearanceTime: () => Date.now()
      }),
      on: {
        KEY_PRESS: {
          target: 'processingInput',
        },      },
    },
    processingInput: {
      always: [
        {
          target: 'correctInput',
          guard: ({
            context,
            event
          }) => {
            if (event.type !== 'KEY_PRESS') return false;
            const currentSymbol = context.stream[context.currentIndex];
            if (!currentSymbol) return false;

            return areKeyCapIdArraysEqual(currentSymbol.targetKeyCaps, event.keys);
          },
        },
        {
          target: 'incorrectInput'
        },
      ],
    },
    correctInput: {
      entry: assign({
        stream: ({
          context,
          event: _event
        }) => { // Prefix event with _
          const newStream = [...context.stream];
          const currentSymbol = newStream[context.currentIndex];
          const newAttempt = {
            pressedKeyCups: (_event as { type: 'KEY_PRESS'; keys: KeyCapId[] }).keys,
            startAt: context.symbolAppearanceTime,
            endAt: Date.now(),
          };
          const updatedSymbol = {
            ...currentSymbol,
            attempts: [...currentSymbol.attempts, newAttempt],
          };
          newStream[context.currentIndex] = updatedSymbol;
          return newStream;
        },
        currentIndex: ({
          context
        }) => context.currentIndex + 1,
      }),
      always: [
        {
          target: 'lessonComplete',
          guard: ({
            context
          }) => context.currentIndex >= context.stream.length,
        },
        {
          target: 'awaitingInput'
        },
      ],
    },
    incorrectInput: {
      entry: assign({
        errors: ({
          context
        }) => context.errors + 1,
        stream: ({
          context,
          event: _event
        }) => { // Prefix event with _
          const newStream = [...context.stream];
          const currentSymbol = newStream[context.currentIndex];
          const newAttempt = {
            pressedKeyCups: (_event as { type: 'KEY_PRESS'; keys: KeyCapId[] }).keys,
            startAt: context.symbolAppearanceTime,
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
      entry: sendTo(
        ({ context }) => context.parentActor,
        ({ context }) => ({
          type: 'TRAINING.COMPLETE',
          stream: context.stream
        })
      )
    },
  },
});