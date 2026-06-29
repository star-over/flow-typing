/**
 * @file sessionMachine — машина одного таймерного прогона тренировки.
 * @description Слой ДОСТАВКИ и ЖИЗНЕННОГО ЦИКЛА (бизнес-сущности: таймер, cpm,
 * бюджет). Собирает порцию (fetchDrills), invoke'ит trainingMachine над
 * непрерывным потоком, накапливает event-sourced проекцию completed[] из
 * TYPING.ADVANCED, на чекпоинтах сводит [previousCheckpoint .. completed.length)
 * и шлёт recordCheckpoint, при низкой воде очереди дозагружает (refilling). Таймер
 * стартует с ПЕРВОГО нажатия (состояние armed гасит часы до него — буфер адаптации
 * в бюджет не идёт) и при истечении сразу завершает сессию (без добора ввода). На
 * done сводит ВСЮ сессию в каноническую SessionSummaryPayload и несёт её родителю
 * в SESSION.COMPLETE — те же числа (время/cpm/точность), что пишутся в журнал.
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
import type { DrillSummary } from '@/lib/drill-summarize';
import { joinBatchToStream } from '@/lib/drill-stream';
import { getSymbolLayoutDescriptor } from '@/lib/layouts';
import {
  REFILL_THRESHOLD_SYMBOLS,
  SESSION_DURATION_SECONDS,
  TICK_INTERVAL_MS,
} from '@/lib/session-config';
import { needsRefill as queueNeedsRefill, planCheckpoint } from '@/lib/session-queue';
import {
  shouldJournalSession,
  summarizeSession,
  type SessionSummaryPayload,
} from '@/lib/session-summarize';
import { commitSegment, isExpired as windowExpired, liveElapsed } from '@/lib/session-timer';
import { trainingMachine } from './training.machine';

export interface SessionInput {
  symbolLayoutId: SymbolLayoutId;
  cpm: number;
  parentActor: ParentActor;
}

export interface SessionContext {
  symbolLayoutId: SymbolLayoutId;
  cpm: number;
  parentActor: ParentActor;
  pendingStream: TypingStream; // результат первого fetch до invoke training
  completed: StreamSymbol[]; // проекция набранных символов (из TYPING.ADVANCED)
  previousCheckpoint: number; // индекс в completed, докуда сведено
  totalAppended: number; // сколько символов отдано в training (initial + APPEND)
  elapsedMs: number; // зафиксированный аккумулятор завершённых сегментов
  segmentStartedAt: number; // Date.now() на входе в timing (первое нажатие/resume)
  displayElapsedMs: number; // живое прошедшее для дисплея/истечения (тик), ≤ окна
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
    fetchDrills: fromPromise<TypingStream, { symbolLayoutId: SymbolLayoutId; budgetChars: number }>(
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
    recordSessionSummary: (
      _,
      _params: { payload: SessionSummaryPayload; symbolLayoutId: SymbolLayoutId },
    ) => {
      throw new Error('recordSessionSummary not provided');
    },
    pushCompleted: assign(({ context, event }) => ({
      completed: [...context.completed, (event as { symbol: StreamSymbol }).symbol],
    })),
    markSegmentStart: assign({ segmentStartedAt: () => Date.now() }),
    // Коммит сегмента на выходе из timing (→ paused или → done). Зажим в окно: активное
    // время по построению не превышает бюджет, поэтому displayElapsedMs на done всегда
    // ровно ≤ SESSION_WINDOW_MS (никаких «61 с»). На паузе зажим — no-op (elapsed < окна).
    accumulateElapsed: assign(({ context }) => {
      const committed = commitSegment({
        elapsedMs: context.elapsedMs,
        segmentStartedAt: context.segmentStartedAt,
        now: Date.now(),
        windowMs: SESSION_WINDOW_MS,
      });
      return { elapsedMs: committed, displayElapsedMs: committed };
    }),
    refreshDisplay: assign(({ context }) => ({
      displayElapsedMs: liveElapsed({
        elapsedMs: context.elapsedMs,
        segmentStartedAt: context.segmentStartedAt,
        now: Date.now(),
      }),
    })),
    // Чекпоинт перед дозагрузкой: planCheckpoint — чистое решение «что свести и
    // куда сдвинуть границу» (срез [previousCheckpoint .. completed.length),
    // skip-if-empty), затем инициировать внедрённую запись. recordCheckpoint —
    // провайдер (Convex/skip), вызывается через enqueue.
    checkpointAndRecord: enqueueActions(({ context, enqueue }) => {
      const plan = planCheckpoint({ completed: context.completed, previousCheckpoint: context.previousCheckpoint });
      if (plan === null) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      enqueue({ type: 'recordCheckpoint', params: { summary: plan.summary, symbolLayoutId: context.symbolLayoutId } } as any);
      enqueue.assign({ previousCheckpoint: plan.nextCheckpoint });
    }),
    // Завершение сессии ОДНИМ шагом: порядок чекпоинт → сводка → журнал → родитель
    // выражен СТРУКТУРОЙ этой функции, не порядком массива entry. Две load-bearing
    // зависимости:
    //  (a) summary посчитан до чтения — `summary` локаль; журнал и отправка
    //      родителю её потребляют, сослаться раньше расчёта физически нечем.
    //  (b) CQRS write-before-read — recordCheckpoint enqueue'ится РАНЬШЕ
    //      recordSessionSummary. Обе мутации Convex от одного клиента (singleton
    //      src/lib/convex.ts) исполняются одной упорядоченной очередью по порядку
    //      вызова → drillRecord зафиксирует рост openedSteps раньше, чем
    //      sessions.record его прочитает.
    // Финальный чекпоинт — через тот же planCheckpoint, что и refill (одна точка
    // истины «что попадает в чекпоинт»). Каноническая сводка — единый источник чисел
    // и для журнала (recordSessionSummary), И для экрана результатов (SESSION.COMPLETE):
    // берёт весь completed[] и displayElapsedMs (активное время за вычетом пауз, ≤ окна).
    // Короткую сессию (shouldJournalSession=false) не журналируем, но родителю шлём —
    // порог знает только журнал.
    finalizeAndNotify: enqueueActions(({ context, enqueue }) => {
      const plan = planCheckpoint({ completed: context.completed, previousCheckpoint: context.previousCheckpoint });
      if (plan !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        enqueue({ type: 'recordCheckpoint', params: { summary: plan.summary, symbolLayoutId: context.symbolLayoutId } } as any);
        enqueue.assign({ previousCheckpoint: plan.nextCheckpoint });
      }
      const summary = summarizeSession({ stream: context.completed, durationMs: context.displayElapsedMs });
      if (shouldJournalSession(summary)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        enqueue({ type: 'recordSessionSummary', params: { payload: summary, symbolLayoutId: context.symbolLayoutId } } as any);
      }
      enqueue.sendTo(context.parentActor, { type: 'SESSION.COMPLETE', stream: context.completed, summary });
    }),
    forwardKeyPress: sendTo('training', ({ event }) => ({
      type: 'KEY_PRESS',
      keys: (event as { keys: KeyCapId[] }).keys,
    })),
    appendFetched: enqueueActions(({ context, event, enqueue }) => {
      const fetched = (event as unknown as { output: StreamSymbol[] }).output;
      // Стык порций — это стык drill'ов: тот же разделитель-пробел, что и внутри
      // порции (один дом — joinBatchToStream), иначе хвост старой порции слипается
      // с началом новой. Пустую порцию joinBatchToStream пропускает.
      const symbols = joinBatchToStream({
        batch: fetched,
        symbolLayout: getSymbolLayoutDescriptor(context.symbolLayoutId).symbolLayout,
      });
      if (symbols.length === 0) return;
      enqueue.sendTo('training', { type: 'APPEND_SYMBOLS', symbols });
      enqueue.assign({ totalAppended: ({ context }) => context.totalAppended + symbols.length });
    }),
  },
  guards: {
    // Живой расчёт (не по последнему тику): аккумулятор + текущий незакрытый сегмент.
    // Так истечение ловится ровно на окне, без лага «значение прошлого тика».
    isExpired: ({ context }) =>
      windowExpired({
        elapsedMs: context.elapsedMs,
        segmentStartedAt: context.segmentStartedAt,
        now: Date.now(),
        windowMs: SESSION_WINDOW_MS,
      }),
    needsRefill: ({ context }) =>
      queueNeedsRefill({
        totalAppended: context.totalAppended,
        completedCount: context.completed.length,
        threshold: REFILL_THRESHOLD_SYMBOLS,
      }),
  },
}).createMachine({
  id: 'session',
  initial: 'loading',
  context: ({ input }) => ({
    symbolLayoutId: input.symbolLayoutId,
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
      // (не на timing) — переживает armed и paused.
      invoke: {
        id: 'training',
        src: 'trainingService',
        input: ({ context, self }) => ({
          stream: context.pendingStream,
          symbolLayoutId: context.symbolLayoutId,
          parentActor: self,
        }),
      },
      initial: 'armed',
      states: {
        // Часы стоят, пока юзер не нажал первый символ: время на адаптацию у каждого
        // своё и в бюджет не идёт. Первый KEY_PRESS пересылается в training (символ
        // классифицируется) И входит в timing → markSegmentStart стартует сегмент.
        // Тикера здесь нет → displayElapsedMs = 0 → дисплей держит полные 60 с.
        armed: {
          on: {
            KEY_PRESS: { target: 'timing', actions: 'forwardKeyPress' },
            PAUSE_TIMER: { target: 'armedPaused' },
          },
        },
        // Пауза ДО первого нажатия: часы так и не пошли, замораживать нечего. KEY_PRESS
        // не объявлен → на экране паузы ввод не стартует таймер.
        armedPaused: {
          on: {
            RESUME_TIMER: { target: 'armed' },
          },
        },
        // running + refilling — ОДИН непрерывный сегмент таймера. Тикер и
        // markSegmentStart живут здесь, на родителе `timing`: bounce
        // running↔refilling — внутренний переход, timing НЕ выходит → тикер не
        // перезапускается, segmentStartedAt не сбрасывается, время идёт
        // непрерывно (юзер печатает и во время refill), и истечение может
        // сработать в refilling. accumulateElapsed на exit timing — один коммит
        // при ЛЮБОМ выходе (→ paused или → done), без двойного счёта. Общие
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
            // Истечение → СРАЗУ done (без добора ввода): отсчёт дошёл до 0 — упражнение
            // останавливается мгновенно, привычный ритм не ломается «зависанием на 0».
            TICK: [
              { guard: 'isExpired', target: '#session.done' },
              { actions: 'refreshDisplay' },
            ],
            TIMER_EXPIRED: { target: '#session.done' },
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
      },
    },

    done: {
      // Завершение — ОДНО действие: жёсткий порядок чекпоинт → сводка → журнал →
      // родитель выражен структурой finalizeAndNotify (локаль summary + порядок
      // enqueue), а не порядком этого массива. Инварианты (a)/(b) — у действия.
      entry: 'finalizeAndNotify',
      type: 'final',
    },
  },
});
