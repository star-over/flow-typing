/**
 * @file Машина состояний XState для управления процессом тренировки слепой печати.
 * @description Управляет потоком упражнения, классифицирует ввод пользователя как
 * корректный/ошибочный, копит попытки и завершает урок по достижении конца стрима.
 */
import { assign, sendTo, setup } from 'xstate';

import type { KeyCapId, ParentActor, SymbolLayoutId, TypingStream } from '@/interfaces/types';
import { addAttempt } from '@/lib/stream-utils';
import { areKeyCapIdArraysEqual } from '@/lib/symbol-utils';


export interface TrainingContext {
  stream: TypingStream;
  currentIndex: number;
  errors: number;
  currentSymbolLayoutId: SymbolLayoutId;
  symbolAppearanceTime: number;
  parentActor: ParentActor;
}

export type TrainingEvent =
  | { type: 'KEY_PRESS'; keys: KeyCapId[] };

export interface TrainingInput {
  stream: TypingStream;
  symbolLayoutId: SymbolLayoutId;
  parentActor: ParentActor;
}

export const trainingMachine = setup({
  types: {
    context: {} as TrainingContext,
    events: {} as TrainingEvent,
    input: {} as TrainingInput,
  },
  actions: {
    captureAppearanceTime: assign({
      symbolAppearanceTime: () => Date.now(),
    }),
    // Используется в correctInput и incorrectInput. Сам addAttempt iммутабелен
    // и защищён от out-of-bounds (возвращает исходный stream без изменений).
    recordAttempt: assign(({ context }, params: { keys: KeyCapId[] }) => ({
      stream: addAttempt({
        stream: context.stream,
        cursorPosition: context.currentIndex,
        pressedKeyCaps: params.keys,
        startAt: context.symbolAppearanceTime,
        endAt: Date.now(),
      }),
    })),
    advanceCursor: assign({
      currentIndex: ({ context }) => context.currentIndex + 1,
    }),
    incrementErrors: assign({
      errors: ({ context }) => context.errors + 1,
    }),
    sendLessonComplete: sendTo(
      ({ context }) => context.parentActor,
      ({ context }) => ({
        type: 'TRAINING.COMPLETE',
        stream: context.stream,
      }),
    ),
  },
  guards: {
    isAttemptCorrect: ({ context, event }) => {
      const currentSymbol = context.stream[context.currentIndex];
      if (!currentSymbol) return false;
      return areKeyCapIdArraysEqual({ a: currentSymbol.targetKeyCaps, b: event.keys });
    },
    isLessonComplete: ({ context }) => context.currentIndex >= context.stream.length,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBcBOBDAlgOx1AdDNmBsngDJywD22AxANoAMAuoqAA7WyZm3sgAHogDMADib4ALADYZAdhEBGRfICcAVgBMYqQBoQAT0QBaGSPxqmTJWJ1iNEjRpkBfVwbRZc2AugDuWGS+AJLYHACuyHQA0gCiAJoA+gAKAEpxAMqZzGxIIFw8fNgCwggiGlL4TGIiWvJMWkzy9TIaBsYISlJK+OYKOiptUiLunhg4ePgcqNQAxlR4YZHRuQKFvJj8+WUiMpIyYkoa8nbmavInHYhaVn0jDvUXLUdjIF6TvtOzC7A8oeEoowlHlONxNttQGUpGo1NU1CImBpuvI2ictNcELcDg9tOp5C83h8fAQ5tRUKgwHNkMsgWt8htiqVRPs+kcTmcRBcrkZEFJapYmsitFolJo1FINESJiT8GSKVSaYDViD1uCmTtEEoxfgxBIHC1bHstPzMfyLGohUoRWKNBKpR53jKpjh5ZTqbTVqw1UUtiVNQgGr09fUGidkUoKpjuhZI6oxHIExomPz3I7sNQIHABMS8D6If6oYh5MH9eijTITWJMSYtId8A0RRU1DIpEwrA5pd4pkQSOhglBKH9IQV1X7meU6n0ETpHHJKzIlDXbL0ROo6ia0aiHeNu18AkElsr8xqi+VJdPTi46nJLhjeQgxLrI-qpKiRM29l3PgQZvNFgCKwnuOAYfnCSitq2263I47QPiKcJqGKYgtk0SEtI436ym6iqesBI67BeMgXA4SjNIcagoZixr4JUew9AS8j8jCWEutgOEeseDJjgRiCHBobLHIolqOEcmJ1lUraSkwXKioiLisV8AA2VC0AAwtQAC2HAqcgYD4YWQiiFy+BNHsmh2JuLT6A+zgHCcpxWEwxEqGoaauEAA */
  id: 'training',
  initial: 'awaitingInput',
  context: ({ input }) => ({
    stream: input.stream,
    currentIndex: 0,
    errors: 0,
    currentSymbolLayoutId: input.symbolLayoutId,
    symbolAppearanceTime: 0,
    parentActor: input.parentActor,
  }),
  states: {
    awaitingInput: {
      entry: 'captureAppearanceTime',
      on: {
        KEY_PRESS: 'processingInput',
      },
    },

    processingInput: {
      always: [
        { target: 'correctInput', guard: 'isAttemptCorrect' },
        { target: 'incorrectInput' },
      ],
    },

    correctInput: {
      entry: [
        {
          type: 'recordAttempt',
          params: ({ event }) => ({ keys: event.keys }),
        },
        'advanceCursor',
      ],
      always: [
        { target: 'lessonComplete', guard: 'isLessonComplete' },
        { target: 'awaitingInput' },
      ],
    },

    incorrectInput: {
      entry: [
        'incrementErrors',
        {
          type: 'recordAttempt',
          params: ({ event }) => ({ keys: event.keys }),
        },
      ],
      always: 'awaitingInput',
    },

    lessonComplete: {
      entry: 'sendLessonComplete',
    },
  },
});
