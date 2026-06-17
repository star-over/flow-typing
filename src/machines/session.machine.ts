/**
 * @file sessionMachine — машина одного таймерного прогона тренировки.
 * @description Слой ДОСТАВКИ и ЖИЗНЕННОГО ЦИКЛА (бизнес-сущности: таймер, cpm,
 * бюджет). Собирает порцию (fetchDrills), invoke'ит trainingMachine над
 * непрерывным потоком, накапливает event-sourced проекцию completed[] из
 * TYPING.ADVANCED, на чекпоинтах сводит [previousCheckpoint .. completed.length)
 * и шлёт recordCheckpoint, при низкой воде очереди дозагружает (refilling), по
 * истечении таймера допечатывает очередь и шлёт родителю SESSION.COMPLETE.
 * Чистая: провайдеры fetchDrills/recordCheckpoint внедряются (см. session-impl.ts).
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
  REFILL_THRESHOLD_SYMBOLS,
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
    // внедрённую запись и сдвинуть границу. drillSummarize — чистый;
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
    appendFetched: enqueueActions(({ event, enqueue }) => {
      const symbols = (event as unknown as { output: StreamSymbol[] }).output;
      enqueue.sendTo('training', { type: 'APPEND_SYMBOLS', symbols });
      enqueue.assign({ totalAppended: ({ context }) => context.totalAppended + symbols.length });
    }),
  },
  guards: {
    isExpired: ({ context }) => context.displayElapsedMs >= SESSION_WINDOW_MS,
    allTyped: ({ context }) => context.completed.length >= context.totalAppended,
    needsRefill: ({ context }) =>
      context.totalAppended - (context.completed.length + 1) <= REFILL_THRESHOLD_SYMBOLS,
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
      // sendTo разрешают по id, не по ключу реестра. training invoke'ится на active
      // (не на timing) — переживает paused и draining.
      invoke: {
        id: 'training',
        src: 'trainingService',
        input: ({ context, self }) => ({
          stream: context.pendingStream,
          symbolLayoutId: context.symbolLayoutId,
          parentActor: self,
        }),
      },
      initial: 'timing',
      states: {
        // running + refilling — ОДИН непрерывный сегмент таймера. Тикер и
        // markSegmentStart живут здесь, на родителе `timing`: bounce
        // running↔refilling — внутренний переход, timing НЕ выходит → тикер не
        // перезапускается, segmentStartedAt не сбрасывается, время идёт
        // непрерывно (юзер печатает и во время refill), и истечение может
        // сработать в refilling. accumulateElapsed на exit timing — один коммит
        // при ЛЮБОМ выходе (→ paused или → draining), без двойного счёта. Общие
        // KEY_PRESS/TICK/TIMER_EXPIRED/PAUSE_TIMER — на timing.on (покрывают и
        // running, И refilling). У paused их нет → пауза замораживает И печать, И
        // таймер; ни одно продвижение не теряется.
        timing: {
          entry: 'markSegmentStart',
          exit: 'accumulateElapsed',
          invoke: {
            id: 'ticker',
            src: 'ticker',
            input: { intervalMs: TICK_INTERVAL_MS },
          },
          on: {
            KEY_PRESS: { actions: 'forwardKeyPress' },
            TICK: [
              { guard: 'isExpired', target: 'draining' },
              { actions: 'refreshDisplay' },
            ],
            TIMER_EXPIRED: { target: 'draining' },
            PAUSE_TIMER: { target: 'paused' },
          },
          initial: 'running',
          states: {
            running: {
              on: {
                'TYPING.ADVANCED': [
                  { guard: 'needsRefill', target: 'refilling', actions: ['pushCompleted', 'checkpointAndRecord'] },
                  { actions: 'pushCompleted' },
                ],
              },
            },
            refilling: {
              invoke: {
                id: 'refetch',
                src: 'fetchDrills',
                input: ({ context }) => ({
                  symbolLayoutId: context.symbolLayoutId,
                  openedSteps: context.openedSteps,
                  budgetChars: computeBudgetChars({ secondsRemaining: SESSION_DURATION_SECONDS, cpm: context.cpm }),
                }),
                onDone: { target: 'running', actions: 'appendFetched' },
                onError: { target: 'running' }, // не удалось добрать — продолжаем тем, что есть
              },
              on: {
                // Во время добора печать продолжается, но needsRefill НЕ
                // перепроверяется (один fetch считается достаточным, чтобы хвост
                // снова был выше порога). Безопасно при текущем пороге + добор
                // одной порцией; если порции станут крошечными — добавить
                // повторную проверку/добор здесь.
                'TYPING.ADVANCED': { actions: 'pushCompleted' },
              },
            },
          },
        },
        paused: {
          // Печать и таймер заморожены: ни KEY_PRESS, ни TICK, ни ADVANCED.
          on: {
            RESUME_TIMER: 'timing',
          },
        },
        draining: {
          // Таймер вышел: дозагрузки нет, даём допечатать очередь. Страховочный таймаут
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
