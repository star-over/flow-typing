// src/lib/session-summarize.ts
/**
 * @file `summarizeSession` — чистая клиентская сводка ВСЕЙ сессии для журнала
 * `sessionSummaries` (аналитика/коучинг). Отдельно от `drillSummarize` (дельта в
 * skillProfiles для алгоритма): добавляет направление промаха (confusion) и cpm.
 * Сырые attempts на сервер НЕ уходят — только агрегаты.
 */
import type { TypingStream } from '@/interfaces/types';
import { drillSummarize } from './drill-summarize';
import { areKeyCapIdArraysEqual } from './symbol-utils';

/** Сколько пар-путаниц максимум кладём в строку сессии (защита от роста). */
export const MAX_CONFUSIONS = 20;

export interface SessionConfusion {
  target: string; // целевой символ ('а')
  pressed: string; // нажатый KeyCapId ('KeyS'); V1 — только одиночные. UI переводит в символ через (pressed, symbolLayoutId)
  count: number;
}

export interface SessionSummaryPayload {
  exposures: number;
  clean: number;
  // Пропускная способность за активную минуту (≈ символов/сессию при полном окне),
  // НЕ моторная скорость. Чистую скорость печати UI выводит из latencyMedianMs.
  cpm: number;
  durationMs: number;
  latencyMedianMs: number;
  confusions: SessionConfusion[];
}

export function summarizeSession({
  stream,
  durationMs,
}: {
  stream: TypingStream;
  durationMs: number;
}): SessionSummaryPayload {
  const { overall } = drillSummarize(stream);

  // Направление промаха: судим ТОЛЬКО по первому нажатию (как clean в drillSummarize —
  // проскок не множим). V1 — только одиночные нажатия (сочетания/пустые мимо).
  const tally = new Map<string, SessionConfusion>();
  for (const symbol of stream) {
    const first = symbol.attempts[0];
    if (first === undefined) continue;
    if (areKeyCapIdArraysEqual({ a: first.pressedKeyCaps, b: symbol.targetKeyCaps })) continue;
    if (first.pressedKeyCaps.length !== 1) continue; // V1: пустые/сочетания — мимо
    const pressed = first.pressedKeyCaps[0];
    if (pressed === undefined) continue; // noUncheckedIndexedAccess: сужаем KeyCapId | undefined
    const key = `${symbol.targetSymbol} ${pressed}`;
    const row = tally.get(key) ?? { target: symbol.targetSymbol, pressed, count: 0 };
    row.count += 1;
    tally.set(key, row);
  }
  const confusions = [...tally.values()].sort((a, b) => b.count - a.count).slice(0, MAX_CONFUSIONS);

  // cpm — пропускная способность за активную минуту (durationMs = displayElapsedMs),
  // не моторная скорость (та — из latencyMedianMs). При длительности < 1 с измерение
  // недостоверно → cpm = 0 (не делим на ~ноль).
  return {
    exposures: overall.exposures,
    clean: overall.clean,
    cpm: durationMs >= 1000 ? overall.exposures / (durationMs / 60000) : 0,
    durationMs,
    latencyMedianMs: overall.latencyMedian,
    confusions,
  };
}
