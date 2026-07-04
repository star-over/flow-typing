import { assign, emit, sendTo, setup } from "xstate";

import type { KeyCapId } from "@/interfaces/key-cap-id";
import type { SymbolLayoutId, TypingStream } from "@/interfaces/types";
import type { SessionSummaryPayload } from "@/lib/session-summarize";
import { getPhysicalLayout } from "@/lib/layouts";

const physicalLayoutANSI = getPhysicalLayout('ansi');
import { DEFAULT_SESSION_CPM } from "@/lib/session-config";
import { DEFAULT_USER_SETTINGS } from "@/user-settings/user-settings";

import { keyboardMachine } from "./keyboard.machine";
import { sessionService } from "./session-impl";

export interface AppContext {
  lastTrainingStream: TypingStream | null;
  // Каноническая сводка последней сессии — источник чисел для экрана результатов
  // (те же время/cpm/точность, что в журнале /stats). Приходит в SESSION.COMPLETE.
  lastSessionSummary: SessionSummaryPayload | null;
  currentSymbolLayoutId: SymbolLayoutId;
  /** Длительность сессии, выбранная в меню перед стартом. */
  sessionDurationSeconds: number;
}

export type AppEvent =
  | { type: 'START_TRAINING'; symbolLayoutId: SymbolLayoutId; durationSeconds: number }
  | { type: 'TO_MENU' }
  | { type: 'TRAINER_OPENED' }
  | { type: 'TRAINER_CLOSED' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SESSION.COMPLETE'; stream: TypingStream; summary: SessionSummaryPayload | null }
  | { type: 'KEY_DOWN'; keyCapId: KeyCapId }
  | { type: 'KEY_UP'; keyCapId: KeyCapId }
  | { type: 'RESET_KEYBOARD' }
  | { type: 'KEYBOARD.CHARACTER_INPUT'; keys: KeyCapId[] }
  | { type: 'KEYBOARD.NAVIGATION_KEY'; key: KeyCapId };

export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent,
    // Уведомление через `emit`: пользователь запросил старт тренировки с
    // клавиатуры (Enter в menu). Машина сама не стартует — раскладку знает только
    // UI ($settings), и слушатель есть лишь на /train. Подробности — ниже у menu.
    emitted: {} as { type: 'MENU_START_REQUESTED' },
  },
  actors: {
    keyboardService: keyboardMachine,
    sessionService,
  },
  actions: {
    // Выбор drill'ов и построение потока уехали в sessionMachine (session-impl).
    // На корне — только зафиксировать раскладку и длительность для будущей сессии.
    setTrainingParams: assign((_, params: { symbolLayoutId: SymbolLayoutId; durationSeconds: number }) => ({
      currentSymbolLayoutId: params.symbolLayoutId,
      sessionDurationSeconds: params.durationSeconds,
    })),
    storeSessionResult: assign(
      (_, params: { stream: TypingStream; summary: SessionSummaryPayload | null }) => ({
        lastTrainingStream: params.stream,
        lastSessionSummary: params.summary,
      }),
    ),
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
    lastSessionSummary: null,
    currentSymbolLayoutId: 'qwerty',
    sessionDurationSeconds: DEFAULT_USER_SETTINGS.sessionDurationSeconds,
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
    // Открытие тренажёра всегда начинается с чистого меню. appActor — singleton,
    // переживает SvelteKit-навигацию (ADR 0007), поэтому без сброса экран прошлой
    // сессии (`sessionComplete`) и брошенная пауза/сессия «застревают» и всплывают
    // при возврате на /train. Это ломает «Начать тренировку»: ожидается новая
    // тренировка, а не воскрешение прошлого экрана (ADR 0010). App.svelte шлёт это
    // при входе на /train из любого активного состояния → возврат в `menu`.
    // Пауза/возобновление ВНУТРИ /train не задеты: внутренние переходы не размонтируют App.
    TRAINER_OPENED: { target: '#app.menu' },
    // Зеркало TRAINER_OPENED на ВЫХОД: App.svelte шлёт при размонтировании (уход
    // с /train — клик по логотипу, Settings, Stats). appActor переживает
    // навигацию, а Header в +layout читает таймер/паузу из живого FSM, поэтому
    // без сброса брошенная сессия тикает «в фоне»: обратный отсчёт не
    // останавливается, кнопка «Пауза» висит в шапке. Возврат в menu завершает
    // invoked-sessionService (гасит его таймер) → Header очищается.
    TRAINER_CLOSED: { target: '#app.menu' },
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
            type: 'setTrainingParams',
            params: ({ event }) => ({
              symbolLayoutId: event.symbolLayoutId,
              durationSeconds: event.durationSeconds,
            }),
          },
        },
        // Enter в menu = нажать «Начать тренировку». Машина не стартует напрямую:
        // listener клавиатуры в +layout долетает до appActor на ЛЮБОМ маршруте,
        // а FSM в menu и на /settings — прямой переход стартовал бы тренировку
        // вне экрана. Вместо этого шлём уведомление через `emit`; его ловит
        // App.svelte (есть лишь на /train) и шлёт тот же START_TRAINING с $settings.
        'KEYBOARD.NAVIGATION_KEY': {
          guard: 'isEnter',
          actions: emit({ type: 'MENU_START_REQUESTED' }),
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
          durationSeconds: context.sessionDurationSeconds,
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
            type: 'storeSessionResult',
            params: ({ event }) => ({ stream: event.stream, summary: event.summary }),
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
            type: 'setTrainingParams',
            params: ({ event }) => ({
              symbolLayoutId: event.symbolLayoutId,
              durationSeconds: event.durationSeconds,
            }),
          },
        },
        'KEYBOARD.NAVIGATION_KEY': [
          {
            guard: 'isEnter',
            target: 'trainingStart',
            actions: {
              type: 'setTrainingParams',
              params: ({ context }) => ({
                symbolLayoutId: context.currentSymbolLayoutId,
                durationSeconds: context.sessionDurationSeconds,
              }),
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
