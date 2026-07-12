import { assign, sendTo, setup } from "xstate";

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
  /** Длительность сессии, выбранная в настройках перед стартом. */
  sessionDurationSeconds: number;
}

export type AppEvent =
  | { type: 'START_TRAINING'; symbolLayoutId: SymbolLayoutId; durationSeconds: number }
  // Вход на /train (App.svelte mount) — автостарт тренировки (ADR 0025). Несёт
  // раскладку и длительность из $settings: их знает только UI.
  | { type: 'TRAINER_OPENED'; symbolLayoutId: SymbolLayoutId; durationSeconds: number }
  | { type: 'TRAINER_CLOSED' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SESSION.COMPLETE'; stream: TypingStream; summary: SessionSummaryPayload | null }
  | { type: 'SESSION.ERROR' }
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
    // Вход на /train автоматически запускает тренировку (ADR 0025). Раньше нормализовал в
    // `menu` (ADR 0010), но P0-11(a) вынес конфиг из меню на /settings → одинокая
    // кнопка «Начать тренировку» на входе стала повторным трением (пользователь уже
    // нажал её на лендинге). App.svelte шлёт это на входе из любого состояния с
    // раскладкой/длительностью из $settings → свежая сессия. Ядро 0010 сохранено:
    // возврат на /train не воскрешает залипший экран — он даёт новую тренировку.
    // Пауза/возобновление ВНУТРИ /train не задеты (внутренние переходы не
    // размонтируют App, событие не шлётся).
    TRAINER_OPENED: {
      target: '#app.trainingStart',
      reenter: true,
      actions: {
        type: 'setTrainingParams',
        params: ({ event }) => ({
          symbolLayoutId: event.symbolLayoutId,
          durationSeconds: event.durationSeconds,
        }),
      },
    },
    // Уход с /train (App.svelte unmount) завершает тренажёр: appActor переживает
    // навигацию, а Header в +layout читает таймер/паузу из живого FSM, поэтому без
    // сброса брошенная сессия тикает «в фоне». Возврат в `idle` завершает
    // invoked-sessionService (гасит его таймер) → Header очищается.
    TRAINER_CLOSED: { target: '#app.idle' },
  },
  states: {
    initializing: {
      always: 'idle',
    },

    // Тренажёр «в покое»: пользовательского экрана-меню нет (ADR 0025). Это
    // внутреннее состояние без invoked-сессии — цель гашения при уходе с /train
    // (TRAINER_CLOSED) и исходная точка до автоматического запуска. На /train не рисуется:
    // App.svelte автоматически запускает на входе, MainContent ветки под `idle` не имеет.
    idle: {},

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
        // idle/sessionComplete ребёнка нет, и sendTo мёртвому актору роняет
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
        // Сетевой сбой старта сессии (sessionMachine.error) → отдельный экран
        // ошибки, не тихий пустой sessionComplete. Сводки нет (сбой до active) —
        // ничего не сохраняем, лишь показываем «Повторить».
        'SESSION.ERROR': { target: 'sessionError' },
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
          // при рестарте (START_TRAINING) тоже сработает, но session уже
          // заменяется — RESUME_TIMER отбрасывается умирающим актором.
          exit: sendTo('sessionService', { type: 'RESUME_TIMER' }),
          on: {
            RESUME: 'running',
            // «Начать заново» из паузы: бросить текущую сессию, начать свежую.
            START_TRAINING: {
              target: '#app.trainingStart',
              reenter: true,
              actions: {
                type: 'setTrainingParams',
                params: ({ event }) => ({
                  symbolLayoutId: event.symbolLayoutId,
                  durationSeconds: event.durationSeconds,
                }),
              },
            },
            // Escape и Enter в паузе — оба возобновляют (тумблер паузы). «Уйти» —
            // через шапку (ADR 0025): экрана-меню нет, отдельного abandon-перехода нет.
            'KEYBOARD.NAVIGATION_KEY': [
              { guard: 'isEscape', target: 'running' },
              { guard: 'isEnter', target: 'running' },
            ],
          },
        },
      },
    },

    sessionComplete: {
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
        // Enter = «Начать заново» с сохранённой раскладкой. «Уйти» — через шапку
        // (ADR 0025): экрана-меню нет, Escape инертен.
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
        ],
      },
    },

    // Сетевой сбой старта сессии. START_TRAINING (кнопка «Повторить») / Enter —
    // новая попытка с сохранённой раскладкой. «Уйти» — через шапку (ADR 0025).
    sessionError: {
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
        ],
      },
    },

    trainingStart: {
      always: 'training',
    },

  },
});
