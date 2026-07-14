/**
 * @file Реальные провайдеры sessionMachine: сбор порции и запись чекпоинта.
 * Здесь живёт побочный эффект (Convex), машина session.machine.ts остаётся чистой.
 * Серверный сбор через drillNext (тотален — всегда непустая порция для раскладки с
 * серверными данными, ADR 0011), запись через drillRecord. Сервер недоступен →
 * fetch бросает → sessionMachine уходит в done (офлайн не поддержан).
 */
import { fromPromise } from 'xstate';

import type { SymbolLayoutId, TypingStream } from '@/interfaces/types';
import { glueServerDrills } from '@/lib/drill-stream';
import { convex, api } from '@/lib/convex';
import { sessionMachine } from './session.machine';

/**
 * Наблюдаемость границы с Convex: лог момента запроса (→) и ответа (←) при
 * тренировке. Только в dev — в production консоль не шумит (деградации ниже идут
 * через console.warn и видны всегда). Фильтр в консоли браузера: `[convex]`.
 */
const logConvex = import.meta.env.DEV
  ? (line: string, ...rest: unknown[]) => {
      // eslint-disable-next-line no-console
      console.log(`[convex] ${line}`, ...rest);
    }
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
  const response = await convex.query(api.drill.drillNext, { symbolLayoutId, budgetChars, seed });
  const stream = glueServerDrills({ drills: response.drills, symbolLayoutId });
  const elapsedMs = Math.round(performance.now() - startedAt);
  logConvex(`drillNext ← ${response.drills.length} drill'ов → ${stream.length} символов за ${elapsedMs}ms`);
  return stream;
}

export const sessionService = sessionMachine.provide({
  actors: {
    // drillNext тотален (ADR 0011): на контентный сбой сервер сам подставляет
    // дефолтный drill — клиент всегда получает непустую порцию, ветки деградации на
    // локальный корпус больше нет. Сервер недоступен → throw → onError → done.
    fetchDrills: fromPromise<
      TypingStream,
      { symbolLayoutId: SymbolLayoutId; budgetChars: number }
    >(async ({ input }) => fetchServerDrillStream(input)),
  },
  actions: {
    // Fire-and-forget: запись профиля не блокирует сессию. Офлайн/сбой сети →
    // мутация бросает → молча гасим: доставка сводки best-effort at-most-once
    // (ADR 0015), потеря дельты допустима. Гостя на тренировке нет (ADR 0012).
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
        .catch((err) => console.warn('drillRecord пропущен (офлайн, at-most-once — ADR 0015)', err));
    },
    // Журнал сессии: fire-and-forget, как recordCheckpoint. capturedAt/openedSteps
    // ставит сервер. Офлайн → молча гасим (at-most-once, ADR 0015).
    recordSessionSummary: (_, params) => {
      const { payload, symbolLayoutId } = params;
      logConvex(
        `sessionRecord → ${payload.exposures} символов, cpm=${Math.round(payload.cpm)} confusions=${payload.confusions.length}`,
      );
      const startedAt = performance.now();
      void convex
        .mutation(api.sessions.record, { symbolLayoutId, ...payload })
        .then(() => logConvex(`sessionRecord ← ok за ${Math.round(performance.now() - startedAt)}ms`))
        .catch((err) => console.warn('sessionSummary пропущен (офлайн, at-most-once — ADR 0015)', err));
    },
  },
});
