import { assign, sendTo, setup } from "xstate";

import type { KeyCapId } from "@/interfaces/key-cap-id";
import type { SymbolLayoutId, TypingStream } from "@/interfaces/types";
import { getPhysicalLayout } from "@/lib/layouts";

const physicalLayoutANSI = getPhysicalLayout('ansi');
import { DEFAULT_SESSION_CPM } from "@/lib/session-config";

import { keyboardMachine } from "./keyboard.machine";
import { sessionService } from "./session-impl";

export interface AppContext {
  lastTrainingStream: TypingStream | null;
  currentSymbolLayoutId: SymbolLayoutId;
}

export type AppEvent =
  | { type: 'START_TRAINING'; symbolLayoutId: SymbolLayoutId }
  | { type: 'TO_MENU' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SESSION.COMPLETE'; stream: TypingStream }
  | { type: 'KEY_DOWN'; keyCapId: KeyCapId }
  | { type: 'KEY_UP'; keyCapId: KeyCapId }
  | { type: 'RESET_KEYBOARD' }
  | { type: 'KEYBOARD.CHARACTER_INPUT'; keys: KeyCapId[] }
  | { type: 'KEYBOARD.NAVIGATION_KEY'; key: KeyCapId };

export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent,
  },
  actors: {
    keyboardService: keyboardMachine,
    sessionService,
  },
  actions: {
    // Выбор drill'ов и построение потока уехали в sessionMachine (session-impl).
    // На корне — только зафиксировать раскладку для будущей сессии.
    setSymbolLayout: assign((_, params: { symbolLayoutId: SymbolLayoutId }) => ({
      currentSymbolLayoutId: params.symbolLayoutId,
    })),
    storeCompletedStream: assign((_, params: { stream: TypingStream }) => ({
      lastTrainingStream: params.stream,
    })),
  },
  guards: {
    isEscape: ({ event }) =>
      event.type === 'KEYBOARD.NAVIGATION_KEY' && event.key === 'Escape',
    isEnter: ({ event }) =>
      event.type === 'KEYBOARD.NAVIGATION_KEY' && event.key === 'Enter',
  },
}).createMachine({
  id: 'app',
  initial: 'initializing',
  invoke: {
    id: 'keyboardService',
    src: 'keyboardService',
    input: ({ self }) => ({
      parentActor: self,
      physicalLayout: physicalLayoutANSI,
    }),
  },
  context: {
    lastTrainingStream: null,
    currentSymbolLayoutId: 'qwerty',
  },
  on: {
    KEY_DOWN: {
      actions: sendTo('keyboardService', ({ event }) => ({
        type: 'KEY_DOWN',
        keyCapId: event.keyCapId,
      })),
    },
    KEY_UP: {
      actions: sendTo('keyboardService', ({ event }) => ({
        type: 'KEY_UP',
        keyCapId: event.keyCapId,
      })),
    },
    RESET_KEYBOARD: {
      actions: sendTo('keyboardService', { type: 'RESET' }),
    },
  },
  states: {
    initializing: {
      always: 'menu',
    },

    menu: {
      on: {
        START_TRAINING: {
          target: 'trainingStart',
          reenter: true,
          actions: {
            type: 'setSymbolLayout',
            params: ({ event }) => ({ symbolLayoutId: event.symbolLayoutId }),
          },
        },
      },
    },

    training: {
      initial: 'running',
      invoke: {
        id: 'sessionService',
        src: 'sessionService',
        input: ({ context, self }) => ({
          symbolLayoutId: context.currentSymbolLayoutId,
          cpm: DEFAULT_SESSION_CPM,
          parentActor: self,
        }),
      },
      on: {
        // Форвард ввода в session ТОЛЬКО внутри training — здесь живёт
        // invoked-ребёнок. На корневом уровне это морозит root-актор: в
        // menu/sessionComplete ребёнка нет, и sendTo мёртвому актору роняет
        // машину в error (см. app.machine.test.ts «stray CHARACTER_INPUT»).
        // sessionService шлёт SESSION.COMPLETE тоже только изнутри training.
        'KEYBOARD.CHARACTER_INPUT': {
          actions: sendTo('sessionService', ({ event }) => ({
            type: 'KEY_PRESS',
            keys: event.keys,
          })),
        },
        'SESSION.COMPLETE': {
          target: 'sessionComplete',
          actions: {
            type: 'storeCompletedStream',
            params: ({ event }) => ({ stream: event.stream }),
          },
        },
      },
      states: {
        running: {
          on: {
            PAUSE: 'paused',
            'KEYBOARD.NAVIGATION_KEY': { guard: 'isEscape', target: 'paused' },
          },
        },
        paused: {
          entry: [
            sendTo('keyboardService', { type: 'RESET' }),
            sendTo('sessionService', { type: 'PAUSE_TIMER' }),
          ],
          // при → menu тоже сработает, но session уже останавливается — RESUME_TIMER отбрасывается
          exit: sendTo('sessionService', { type: 'RESUME_TIMER' }),
          on: {
            RESUME: 'running',
            TO_MENU: '#app.menu',
            'KEYBOARD.NAVIGATION_KEY': [
              { guard: 'isEscape', target: '#app.menu' },
              { guard: 'isEnter', target: 'running' },
            ],
          },
        },
      },
    },

    sessionComplete: {
      on: {
        TO_MENU: { target: 'menu', reenter: true },
        START_TRAINING: {
          target: 'trainingStart',
          reenter: true,
          actions: {
            type: 'setSymbolLayout',
            params: ({ event }) => ({ symbolLayoutId: event.symbolLayoutId }),
          },
        },
        'KEYBOARD.NAVIGATION_KEY': [
          {
            guard: 'isEnter',
            target: 'trainingStart',
            actions: {
              type: 'setSymbolLayout',
              params: ({ context }) => ({ symbolLayoutId: context.currentSymbolLayoutId }),
            },
          },
          // Esc дублирует кнопку «В меню» (TO_MENU): та же навигация с клавиатуры.
          { guard: 'isEscape', target: 'menu', reenter: true },
        ],
      },
    },

    trainingStart: {
      always: 'training',
    },

  },
});
