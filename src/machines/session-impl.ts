/**
 * @file Реальные провайдеры sessionMachine: сбор порции и запись чекпоинта.
 * Здесь живёт импурность (корпус/Convex), машина session.machine.ts остаётся
 * чистой. Серверный fetch через drillNext, запись через drillRecord.
 * Гость/офлайн деградирует на локальный корпус без записи.
 */
import { fromPromise } from 'xstate';

import type { SymbolLayoutId, TypingStream } from '@/interfaces/types';
import type { DrillSummary } from '@/lib/drill-summarize';
import { fetchLocalDrillStream, fetchServerDrillStream } from '@/lib/drill-stream';
import { convex, api } from '@/lib/convex';
import { sessionMachine } from './session.machine';

export const sessionService = sessionMachine.provide({
  actors: {
    fetchDrills: fromPromise<
      TypingStream,
      { symbolLayoutId: SymbolLayoutId; openedSteps: number; budgetChars: number }
    >(async ({ input }) => {
      try {
        const stream = await fetchServerDrillStream(input);
        if (stream.length > 0) return stream;
        // contentGap (пустой пул на сервере) приходит как успешный ответ
        // `{ drills: [] }`, не throw — деградируем на корпус, чтобы не уйти в
        // пустую сессию.
        console.warn('fetchDrills: сервер вернул пусто (contentGap), локальный корпус');
      } catch (err) {
        // Офлайн/гость — деградируем на локальный корпус.
        console.warn('fetchDrills: сервер недоступен, локальный корпус', err);
      }
      return fetchLocalDrillStream({ symbolLayoutId: input.symbolLayoutId, budgetChars: input.budgetChars });
    }),
  },
  actions: {
    // Fire-and-forget: запись профиля не блокирует сессию. Гость (не
    // авторизован) → drillRecord бросит 'Not authenticated' → молча гасим.
    recordCheckpoint: (_, params) => {
      const { summary, symbolLayoutId } = params as { summary: DrillSummary; symbolLayoutId: SymbolLayoutId };
      void convex
        .mutation(api.drill.drillRecord, { symbolLayoutId, summary })
        .catch((err) => console.warn('drillRecord пропущен (гость/офлайн)', err));
    },
  },
});
