/**
 * @file Реальные провайдеры sessionMachine: сбор порции и запись чекпоинта.
 * Здесь живёт импурность (корпус/Convex), машина session.machine.ts остаётся
 * чистой. На этом шаге fetch — локальный (корпус), record — пропуск
 * (drillRecord подключается в задаче 6).
 */
import { fromPromise } from 'xstate';

import type { SymbolLayoutId, TypingStream } from '@/interfaces/types';
import { fetchLocalDrillStream } from '@/lib/drill-stream';
import { sessionMachine } from './session.machine';

export const sessionService = sessionMachine.provide({
  actors: {
    fetchDrills: fromPromise<
      TypingStream,
      { symbolLayoutId: SymbolLayoutId; openedSteps: number; budgetChars: number }
    >(async ({ input }) => {
      // openedSteps не используется локальным сбором — фильтр по шагу делает серверный fetch (задача 6)
      return fetchLocalDrillStream({
        symbolLayoutId: input.symbolLayoutId,
        budgetChars: input.budgetChars,
      });
    }),
  },
  actions: {
    // Запись профиля подключается в задаче 6 (drillRecord). Пока no-op,
    // чтобы петля замкнулась без авторизации/сети.
    recordCheckpoint: () => {},
  },
});
