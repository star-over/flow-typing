/**
 * @file sessionMachine — машина одного таймерного прогона тренировки.
 * @description Слой ДОСТАВКИ и ЖИЗНЕННОГО ЦИКЛА (бизнес-сущности: таймер, cpm,
 * бюджет). Собирает порцию (fetchDrills), invoke'ит trainingMachine над
 * непрерывным потоком, накапливает event-sourced проекцию completed[] из
 * TYPING.ADVANCED, на чекпоинтах сводит [previousCheckpoint .. completed.length)
 * и шлёт recordCheckpoint, по истечении таймера допечатывает очередь и шлёт
 * родителю SESSION.COMPLETE. Чистая: провайдеры fetchDrills/recordCheckpoint
 * инъектируются (см. session-impl.ts). Refill — задача 7.
 */
import { assign, enqueueActions, fromCallback, fromPromise, sendTo, setup } from 'xstate';

import type {
  KeyCapId,
  ParentActor,
  StreamSymbol,
  SymbolLayoutId,
  TypingStream,
} from '@/interfaces/types';
import { computeBudgetChars } from '@/lib/batch-budget';
import { drillSummarize, type DrillSummary } from '@/lib/drill-summarize';
import {
  DRAIN_CAP_MS,
  SESSION_DURATION_SECONDS,
  TICK_INTERVAL_MS,
} from '@/lib/session-config';
import { trainingMachine } from './training.machine';

export interface SessionInput {
  symbolLayoutId: SymbolLayoutId;
  openedSteps: number;
  cpm: number;
  parentActor: ParentActor;
}

export interface SessionContext {
  symbolLayoutId: SymbolLayoutId;
  openedSteps: number;
  cpm: number;
  parentActor: ParentActor;
  pendingStream: TypingStream; // результат первого fetch до invoke training
  completed: StreamSymbol[]; // проекция набранных символов (из TYPING.ADVANCED)
  previousCheckpoint: number; // индекс в completed, докуда сведено
  totalAppended: number; // сколько символов отдано в training (initial + APPEND)
  elapsedMs: number; // зафиксированный аккумулятор завершённых сегментов
  segmentStartedAt: number; // Date.now() на входе в running
  displayElapsedMs: number; // живое прошедшее для дисплея/истечения (тик)
}

export type SessionEvent =
  | { type: 'KEY_PRESS'; keys: KeyCapId[] } // форвард вниз в training
  | { type: 'TYPING.ADVANCED'; symbol: StreamSymbol } // от training
  | { type: 'PAUSE_TIMER' }
  | { type: 'RESUME_TIMER' }
  | { type: 'TICK' } // от тикера
  | { type: 'TIMER_EXPIRED' }; // от тикера (или теста) при выходе окна

const SESSION_WINDOW_MS = SESSION_DURATION_SECONDS * 1000;

export const sessionMachine = setup({
  types: {
    context: {} as SessionContext,
    events: {} as SessionEvent,
    input: {} as SessionInput,
  },
  actors: {
    trainingService: trainingMachine,
    // Провайдеры — дефолты-заглушки. Реальные в session-impl.ts; тесты переопределяют.
    fetchDrills: fromPromise<TypingStream, { symbolLayoutId: SymbolLayoutId; openedSteps: number; budgetChars: number }>(
      async () => {
        throw new Error('fetchDrills not provided');
      },
    ),
    ticker: fromCallback<{ type: 'TICK' }, { intervalMs: number }>(({ sendBack, input }) => {
      const id = setInterval(() => sendBack({ type: 'TICK' }), input.intervalMs);
      return () => clearInterval(id);
    }),
  },
  actions: {
    recordCheckpoint: (_, _params: { summary: DrillSummary; symbolLayoutId: SymbolLayoutId }) => {
      throw new Error('recordCheckpoint not provided');
    },
    pushCompleted: assign(({ context, event }) => ({
      completed: [...context.completed, (event as { symbol: StreamSymbol }).symbol],
    })),
    markSegmentStart: assign({ segmentStartedAt: () => Date.now() }),
    accumulateElapsed: assign(({ context }) => {
      const committed = context.elapsedMs + (Date.now() - context.segmentStartedAt);
      return { elapsedMs: committed, displayElapsedMs: committed };
    }),
    refreshDisplay: assign(({ context }) => ({
      displayElapsedMs: context.elapsedMs + (Date.now() - context.segmentStartedAt),
    })),
    // Один вход: свести [previousCheckpoint .. completed.length), инициировать
    // инъектированную запись и сдвинуть границу. drillSummarize — чистый;
    // recordCheckpoint — провайдер (Convex/skip), вызывается через enqueue.
    checkpointAndRecord: enqueueActions(({ context, enqueue }) => {
      const slice = context.completed.slice(context.previousCheckpoint);
      if (slice.length === 0) return;
      const summary = drillSummarize(slice);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      enqueue({ type: 'recordCheckpoint', params: { summary, symbolLayoutId: context.symbolLayoutId } } as any);
      enqueue.assign({ previousCheckpoint: context.completed.length });
    }),
    sendComplete: sendTo(
      ({ context }) => context.parentActor,
      ({ context }) => ({ type: 'SESSION.COMPLETE', stream: context.completed }),
    ),
    forwardKeyPress: sendTo('training', ({ event }) => ({
      type: 'KEY_PRESS',
      keys: (event as { keys: KeyCapId[] }).keys,
    })),
  },
  guards: {
    isExpired: ({ context }) => context.displayElapsedMs >= SESSION_WINDOW_MS,
    allTyped: ({ context }) => context.completed.length >= context.totalAppended,
  },
  delays: {
    drainCap: DRAIN_CAP_MS,
  },
}).createMachine({
  id: 'session',
  initial: 'loading',
  context: ({ input }) => ({
    symbolLayoutId: input.symbolLayoutId,
    openedSteps: input.openedSteps,
    cpm: input.cpm,
    parentActor: input.parentActor,
    pendingStream: [],
    completed: [],
    previousCheckpoint: 0,
    totalAppended: 0,
    elapsedMs: 0,
    segmentStartedAt: 0,
    displayElapsedMs: 0,
  }),
  states: {
    loading: {
      invoke: {
        id: 'fetchInitial',
        src: 'fetchDrills',
        input: ({ context }) => ({
          symbolLayoutId: context.symbolLayoutId,
          openedSteps: context.openedSteps,
          budgetChars: computeBudgetChars({ secondsRemaining: SESSION_DURATION_SECONDS, cpm: context.cpm }),
        }),
        onDone: {
          target: 'active',
          actions: assign(({ event }) => ({
            pendingStream: event.output,
            totalAppended: event.output.length,
          })),
        },
        onError: { target: 'done' }, // пустой fetch → нечего печатать, в конец
      },
    },

    active: {
      // registry-ключ актора — `trainingService` (соглашение xService, как в
      // appMachine), но адресуемся по invoke id 'training': XState и children, и
      // sendTo резолвят по id, не по ключу реестра.
      invoke: {
        id: 'training',
        src: 'trainingService',
        input: ({ context, self }) => ({
          stream: context.pendingStream,
          symbolLayoutId: context.symbolLayoutId,
          parentActor: self,
        }),
      },
      // ВНИМАНИЕ: KEY_PRESS и TYPING.ADVANCED НЕ на active.on, а в каждом
      // подсостоянии, где печать активна (running/draining). В paused их нет —
      // на паузе ввод не форвардится в training, курсор не двигается, и
      // TYPING.ADVANCED прийти не может (нечему). Так пауза замораживает и
      // таймер, И печать; ни одно продвижение не теряется.
      initial: 'running',
      states: {
        running: {
          entry: 'markSegmentStart',
          invoke: {
            id: 'ticker',
            src: 'ticker',
            input: { intervalMs: TICK_INTERVAL_MS },
          },
          on: {
            KEY_PRESS: { actions: 'forwardKeyPress' },
            'TYPING.ADVANCED': { actions: 'pushCompleted' },
            TICK: [
              { guard: 'isExpired', target: 'draining', actions: 'accumulateElapsed' },
              { actions: 'refreshDisplay' },
            ],
            TIMER_EXPIRED: { target: 'draining', actions: 'accumulateElapsed' },
            PAUSE_TIMER: { target: 'paused', actions: 'accumulateElapsed' },
          },
        },
        paused: {
          // Печать заморожена: ни форварда KEY_PRESS, ни обработки ADVANCED.
          on: {
            RESUME_TIMER: 'running',
          },
        },
        draining: {
          // Таймер вышел: дозагрузки нет, даём допечатать очередь. Кап-драйн
          // не даёт зависнуть, если юзер бросил печатать на середине символа.
          after: {
            drainCap: { target: '#session.done' },
          },
          always: { guard: 'allTyped', target: '#session.done' },
          on: {
            KEY_PRESS: { actions: 'forwardKeyPress' },
            'TYPING.ADVANCED': { actions: 'pushCompleted' },
          },
        },
      },
    },

    done: {
      entry: ['checkpointAndRecord', 'sendComplete'],
      type: 'final',
    },
  },
});
