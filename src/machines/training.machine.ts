/**
 * @file Машина состояний XState для управления процессом тренировки слепой печати.
 * @description Эта машина управляет потоком упражнения, обрабатывает ввод пользователя,
 * отслеживает ошибки и прогресс, а также управляет визуальным состоянием
 * целевых клавиш и пальцев.
 */
import { assign, createMachine, sendTo } from 'xstate';

import { KeyCapId, TypingStream, ParentActor } from '@/interfaces/types';
import { UserPreferences } from '@/interfaces/user-preferences';
import { areKeyCapIdArraysEqual } from '@/lib/symbol-utils';


export interface TrainingContext {
  stream: TypingStream;
  currentIndex: number;
  errors: number;
  keyboardLayout: UserPreferences['keyboardLayout']; // Added to context
  symbolAppearanceTime: number;
  parentActor: ParentActor;
}

export type TrainingEvent =
  | { type: 'KEY_PRESS'; keys: KeyCapId[] };


/**
 * XState машина состояний для управления логикой тренировки.
 * @returns Инстанс XState машины тренировки.
 */
export const trainingMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBcBOBDAlgOx1AdDNmBsngDJywD22AxANoAMAuoqAA7WyZm3sgAHogDMADib4ALADYZAdhEBGRfICcAVgBMYqQBoQAT0QBaGSPxqmTJWJ1iNEjRpkBfVwbRZc2AugDuWGS+AJLYHACuyHQA0gCiAJoA+gAKAEpxAMqZzGxIIFw8fNgCwggiGlL4TGIiWvJMWkzy9TIaBsYISlJK+OYKOiptUiLunhg4ePgcqNQAxlR4YZHRuQKFvJj8+WUiMpIyYkoa8nbmavInHYhaVn0jDvUXLUdjIF6TvtOzC7A8oeEoowlHlONxNttQGUpGo1NU1CImBpuvI2ictNcELcDg9tOp5C83h8fAQ5tRUKgwHNkMsgWt8htiqVRPs+kcTmcRBcrkZEFJapYmsitFolJo1FINESJiT8GSKVSaYDViD1uCmTtEEoxfgxBIHC1bHstPzMfyLGohUoRWKNBKpR53jKpjh5ZTqbTVqw1UUtiVNQgGr09fUGidkUoKpjuhZI6oxHIExomPz3I7sNQIHABMS8D6If6oYh5MH9eijTITWJMSYtId8A0RRU1DIpEwrA5pd4pkQSOhglBKH9IQV1X7meU6n0ETpHHJKzIlDXbL0ROo6ia0aiHeNu18AkElsr8xqi+VJdPTi46nJLhjeQgxLrI-qpKiRM29l3PgQZvNFgCKwnuOAYfnCSitq2263I47QPiKcJqGKYgtk0SEtI436ym6iqesBI67BeMgXA4SjNIcagoZixr4JUew9AS8j8jCWEutgOEeseDJjgRiCHBobLHIolqOEcmJ1lUraSkwXKioiLisV8AA2VC0AAwtQAC2HAqcgYD4YWQiiFy+BNHsmh2JuLT6A+zgHCcpxWEwxEqGoaauEAA */
  id: 'training',
  initial: 'awaitingInput',
  types: {} as {
    context: TrainingContext;
    events: TrainingEvent;
    input: {
      stream: TypingStream;
      keyboardLayout: UserPreferences['keyboardLayout'],
      parentActor: ParentActor
    };
  },  context: ({
    input
  }) => ({
    stream: input.stream,
    currentIndex: 0,
    errors: 0,
    keyboardLayout: input.keyboardLayout,
    symbolAppearanceTime: 0,
    parentActor: input.parentActor,
  }),
  states: {
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

    lessonComplete: {
      entry: sendTo(
        ({ context }) => context.parentActor,
        ({ context }) => ({
          type: 'TRAINING.COMPLETE',
          stream: context.stream
        })
      )
    }
  },
});
