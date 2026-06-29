// src/lib/session-summarize.ts
/**
 * @file `summarizeSession` — чистая клиентская сводка ВСЕЙ сессии для журнала
 * `sessionSummaries` (аналитика/коучинг). Отдельно от `drillSummarize` (дельта в
 * skillProfiles для алгоритма): добавляет направление промаха (confusion) и cpm.
 * Сырые attempts на сервер НЕ уходят — только агрегаты.
 */
import type { TypingStream } from '@/interfaces/types';
import { foldDrillSummary } from './drill-summarize';
import { readExposures } from './exposure-reading';
import { MIN_JOURNAL_EXPOSURES } from './session-config';

/** Сколько пар-путаниц максимум кладём в строку сессии (защита от роста). */
export const MAX_CONFUSIONS = 20;

/**
 * Минимум межсимвольных интервалов, ниже которого ровность ритма недостоверна →
 * метрику не считаем (поле опускается, в /stats — «—»). Реальные записываемые
 * сессии набирают десятки интервалов, так что отсекаются лишь вырожденные.
 */
export const MIN_RHYTHM_INTERVALS = 5;

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
  // Ровность ритма за сессию: 100·(1 − σ/μ)% по межсимвольным интервалам (CV,
  // как Monkeytype Consistency). Нормирована на μ → не зависит от темпа. Опционально:
  // при нехватке интервалов (< MIN_RHYTHM_INTERVALS) поле опускается (старые строки
  // журнала его тоже не имеют) → в /stats показывается «—».
  rhythm?: number;
}

/**
 * Ровность ритма (0–100%) = 100·(1 − CV), где `CV = σ/μ` интервалов. `undefined`
 * при нехватке данных — пусть слой отображения покажет «—», а не ложный «0%».
 */
export function rhythmConsistency(intervals: number[]): number | undefined {
  if (intervals.length < MIN_RHYTHM_INTERVALS) return undefined;
  const mean = intervals.reduce((sum, x) => sum + x, 0) / intervals.length;
  if (mean <= 0) return undefined;
  const variance = intervals.reduce((sum, x) => sum + (x - mean) ** 2, 0) / intervals.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.round(100 * Math.max(0, 1 - cv));
}

export function summarizeSession({
  stream,
  durationMs,
}: {
  stream: TypingStream;
  durationMs: number;
}): SessionSummaryPayload {
  // Единственный проход потока — общий шов вычитания проскока и латентности.
  // Из тех же чтений выводим overall, confusions и ритм.
  const readings = readExposures(stream);
  const { overall } = foldDrillSummary(readings);

  // Направление промаха: судим ТОЛЬКО по первому нажатию (`reading.clean` — то же
  // вычитание проскока). V1 — только одиночные нажатия (сочетания/пустые мимо).
  const tally = new Map<string, SessionConfusion>();
  for (const reading of readings) {
    if (reading.clean) continue;
    if (reading.firstAttempt.pressedKeyCaps.length !== 1) continue; // V1: пустые/сочетания — мимо
    const pressed = reading.firstAttempt.pressedKeyCaps[0];
    if (pressed === undefined) continue; // noUncheckedIndexedAccess: сужаем KeyCapId | undefined
    const key = `${reading.targetSymbol} ${pressed}`;
    const row = tally.get(key) ?? { target: reading.targetSymbol, pressed, count: 0 };
    row.count += 1;
    tally.set(key, row);
  }
  const confusions = [...tally.values()].sort((a, b) => b.count - a.count).slice(0, MAX_CONFUSIONS);

  // Ровность ритма — отдельно от drill-метрик: те же межсимвольные латентности
  // предъявлений, но как CV всей сессии (окно сессии, не τ-EWMA живого канала).
  const intervals = readings.flatMap((r) => (r.latency !== undefined ? [r.latency] : []));
  const rhythm = rhythmConsistency(intervals);

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
    // Опускаем при нехватке данных — `undefined` не шлём в Convex (optional-поле).
    ...(rhythm !== undefined ? { rhythm } : {}),
  };
}

/**
 * Журналируем ли сессию: короткая (< MIN_JOURNAL_EXPOSURES предъявлений) — шум
 * (мало данных, неустойчивый cpm/латентность), строку в sessionSummaries не пишем.
 * На экране результатов короткую сессию всё равно показываем — этот порог знает
 * только журнал (доставка сводки родителю его не проверяет).
 */
export function shouldJournalSession(summary: SessionSummaryPayload): boolean {
  return summary.exposures >= MIN_JOURNAL_EXPOSURES;
}
