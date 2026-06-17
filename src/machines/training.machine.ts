/**
 * @file Машина состояний XState — чистый классификатор печати.
 * @description Прогоняет непрерывный TypingStream: классифицирует ввод как
 * корректный/ошибочный, копит attempts, шлёт родителю TYPING.ADVANCED на каждом
 * продвижении курсора, принимает дозагрузку хвоста через APPEND_SYMBOLS.
 * Завершение сессии — НЕ его забота (решает sessionMachine по таймеру).
 */
import { assertEvent, assign, sendTo, setup } from 'xstate';

import type { KeyCapId, ParentActor, StreamSymbol, SymbolLayoutId, TypingStream } from '@/interfaces/types';
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
  | { type: 'KEY_PRESS'; keys: KeyCapId[] }
  | { type: 'APPEND_SYMBOLS'; symbols: StreamSymbol[] };

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
    // Используется в correctInput и incorrectInput. Сам addAttempt неизменяем
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
    // Шлёт родителю ЗАВЕРШЁННЫЙ (замороженный) символ — курсор уже за ним,
    // attempts финальны. База для event-sourced проекции sessionMachine.
    notifyAdvanced: sendTo(
      ({ context }) => context.parentActor,
      ({ context }) => ({
        type: 'TYPING.ADVANCED',
        symbol: context.stream[context.currentIndex]!,
      }),
    ),
    appendSymbols: assign(({ context }, params: { symbols: StreamSymbol[] }) => ({
      stream: [...context.stream, ...params.symbols],
    })),
  },
  guards: {
    isAttemptCorrect: ({ context, event }) => {
      assertEvent(event, 'KEY_PRESS');
      const currentSymbol = context.stream[context.currentIndex];
      if (!currentSymbol) return false;
      return areKeyCapIdArraysEqual({ a: currentSymbol.targetKeyCaps, b: event.keys });
    },
  },
}).createMachine({
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
  // Дозагрузка хвоста доступна в любом состоянии — поток непрерывен.
  on: {
    APPEND_SYMBOLS: {
      actions: {
        type: 'appendSymbols',
        params: ({ event }) => ({ symbols: event.symbols }),
      },
    },
  },
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
      // ПОРЯДОК ЖЁСТКИЙ, не переставлять: recordAttempt пишет attempt в
      // stream[currentIndex]; notifyAdvanced читает этот уже-замороженный символ
      // (с attempt'ом) и шлёт его родителю; advanceCursor двигает курсор за него.
      // На конце потока просто ждём в awaitingInput — автоматического завершения нет, конец
      // сессии решает sessionMachine.
      entry: [
        {
          type: 'recordAttempt',
          params: ({ event }) => {
            assertEvent(event, 'KEY_PRESS');
            return { keys: event.keys };
          },
        },
        'notifyAdvanced',
        'advanceCursor',
      ],
      always: 'awaitingInput',
    },

    incorrectInput: {
      entry: [
        'incrementErrors',
        {
          type: 'recordAttempt',
          params: ({ event }) => {
            assertEvent(event, 'KEY_PRESS');
            return { keys: event.keys };
          },
        },
      ],
      always: 'awaitingInput',
    },
  },
});
