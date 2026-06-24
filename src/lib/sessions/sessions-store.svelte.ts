import { api, convex } from '@/lib/convex';
import type { FunctionReturnType } from 'convex/server';
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
import type { SymbolLayoutId } from '@/interfaces/types';

// Тип строки журнала берём из Convex-вывода listMine (как RepertoireSnapshot из
// repertoireSnapshot) — без импорта из convex/, codegen уже даёт тип через api.
export type SessionSummary = FunctionReturnType<typeof api.sessions.listMine>[number];

/** Презентационная строка таблицы сеансов. */
export interface SessionRow {
  id: string;
  date: string; // toLocaleString(locale)
  durationSeconds: number; // целые секунды
  cpm: number; // целое
  accuracy: string; // один знак, напр. "97.2"
}

/** Чистый форматтер: документ сеанса → строка таблицы. Округления как в LessonStatsDisplay. */
export function formatSessionRow({
  session,
  locale,
}: {
  session: SessionSummary;
  locale: string;
}): SessionRow {
  const accuracy = session.exposures > 0 ? (session.clean / session.exposures) * 100 : 0;
  return {
    id: session._id,
    date: new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(session.capturedAt),
    durationSeconds: Math.round(session.durationMs / 1000),
    cpm: Math.round(session.cpm),
    accuracy: accuracy.toFixed(1),
  };
}

/**
 * Reactive store истории сеансов текущего юзера для текущей раскладки. Вызывать в
 * +layout (svelte-context), после auth. Подписка живёт весь сеанс (паттерн
 * repertoire-store): при смене раскладки $effect переподписывается, гость → [].
 */
export function createSessionsStore({
  authStore,
  symbolLayoutId,
}: {
  authStore: AuthStore;
  symbolLayoutId: () => SymbolLayoutId;
}) {
  let sessions = $state<SessionSummary[]>([]);

  $effect(() => {
    if (authStore.state.status !== 'authenticated') {
      sessions = [];
      return;
    }
    const unsubscribe = convex.onUpdate(
      api.sessions.listMine,
      { symbolLayoutId: symbolLayoutId() },
      (result) => {
        sessions = result;
      },
    );
    return () => unsubscribe();
  });

  return {
    get list() {
      return sessions;
    },
  };
}

export type SessionsStore = ReturnType<typeof createSessionsStore>;
