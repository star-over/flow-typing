/**
 * @file Реальные провайдеры sessionMachine: сбор порции и запись чекпоинта.
 * Здесь живёт побочный эффект (корпус/Convex), машина session.machine.ts остаётся
 * чистой. Серверный fetch через drillNext, запись через drillRecord.
 * Гость/офлайн деградирует на локальный корпус без записи.
 */
import { fromPromise } from 'xstate';

import type { SymbolLayoutId, TypingStream } from '@/interfaces/types';
import { fetchLocalDrillStream, glueServerDrills } from '@/lib/drill-stream';
import { convex, api } from '@/lib/convex';
import { sessionMachine } from './session.machine';

/**
 * Наблюдаемость границы с Convex: лог момента запроса (→) и ответа (←) при
 * тренировке. Только в dev — в production консоль не шумит (деградации ниже идут
 * через console.warn и видны всегда). Фильтр в консоли браузера: `[convex]`.
 */
const logConvex = import.meta.env.DEV
  ? (line: string, ...rest: unknown[]) => console.log(`[convex] ${line}`, ...rest)
  : () => {
      /* no-op в production */
    };

/** Серверный сбор порции через Convex drillNext (query со свежим seed, ADR 0009). */
async function fetchServerDrillStream({
  symbolLayoutId,
  budgetChars,
}: {
  symbolLayoutId: SymbolLayoutId;
  budgetChars: number;
}): Promise<TypingStream> {
  // Свежий seed на каждый поход → разный ключ кэша query → честная случайная выборка
  // (кэш Convex иначе заморозил бы порцию между записями в namespace).
  const seed = Math.floor(Math.random() * 0x7fffffff);
  logConvex(`drillNext → budgetChars=${budgetChars} layout=${symbolLayoutId} seed=${seed}`);
  const startedAt = performance.now();
  const res = await convex.query(api.drill.drillNext, { symbolLayoutId, budgetChars, seed });
  const stream = glueServerDrills({ drills: res.drills, symbolLayoutId });
  const elapsedMs = Math.round(performance.now() - startedAt);
  logConvex(`drillNext ← ${res.drills.length} drill'ов → ${stream.length} символов за ${elapsedMs}ms`);
  return stream;
}

export const sessionService = sessionMachine.provide({
  actors: {
    fetchDrills: fromPromise<
      TypingStream,
      { symbolLayoutId: SymbolLayoutId; budgetChars: number }
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
      const { summary, symbolLayoutId } = params;
      const { exposures, clean, accuracy } = summary.overall;
      logConvex(
        `drillRecord → ${summary.perSymbol.length} символов, exposures=${exposures} clean=${clean} acc=${accuracy.toFixed(2)}`,
      );
      const startedAt = performance.now();
      void convex
        .mutation(api.drill.drillRecord, { symbolLayoutId, summary })
        .then(() => logConvex(`drillRecord ← ok за ${Math.round(performance.now() - startedAt)}ms`))
        .catch((err) => console.warn('drillRecord пропущен (гость/офлайн)', err));
    },
    // Журнал сессии: fire-and-forget, как recordCheckpoint. capturedAt/openedSteps
    // ставит сервер. Гость → 'Not authenticated' → молча гасим.
    recordSessionSummary: (_, params) => {
      const { payload, symbolLayoutId } = params;
      logConvex(
        `sessionRecord → ${payload.exposures} символов, cpm=${Math.round(payload.cpm)} confusions=${payload.confusions.length}`,
      );
      const startedAt = performance.now();
      void convex
        .mutation(api.sessions.record, { symbolLayoutId, ...payload })
        .then(() => logConvex(`sessionRecord ← ok за ${Math.round(performance.now() - startedAt)}ms`))
        .catch((err) => console.warn('sessionSummary пропущен (гость/офлайн)', err));
    },
  },
});
