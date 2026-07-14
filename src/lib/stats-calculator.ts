// src/lib/stats-calculator.ts
/**
 * @file Числа статистики упражнения для экрана результатов (SessionStatsDisplay).
 * Источник — КАНОНИЧЕСКАЯ SessionSummaryPayload (та же, что пишется в журнал
 * sessionSummaries), а не «настенное» время по attempts: длительность —
 * активное время за вычетом пауз (displayElapsedMs, ≤ окна), посчитанное в
 * sessionMachine. Значения отдаём СЫРЫМИ — округляет уже отображающий слой; и
 * карточка результатов, и строка /stats берут точность из одной `accuracyPercent`
 * (а не синхронизируют формулу комментарием), поэтому числа на двух экранах совпадают.
 */
import type { SessionSummaryPayload } from './session-summarize';

export interface SessionStats {
  durationInSeconds: number;
  accuracy: number; // процент: см. accuracyPercent (как в журнале)
  cpm: number; // знаков в минуту (пропускная способность за активную минуту)
  wpm: number; // слов в минуту = cpm / 5
}

/**
 * Точность предъявлений (%): доля чистых первого нажатия. 0 при нулевых exposures
 * (без деления на ноль). Единственный дом формулы — её читают и карточка результатов
 * (`sessionStatsFromSummary`), и строка /stats (`formatSessionRow`).
 */
export function accuracyPercent({ exposures, clean }: { exposures: number; clean: number }): number {
  return exposures > 0 ? (clean / exposures) * 100 : 0;
}

/** Сводка завершённой сессии → числа карточки результатов. Сырые, без округления. */
export function sessionStatsFromSummary(summary: SessionSummaryPayload): SessionStats {
  const accuracy = accuracyPercent({ exposures: summary.exposures, clean: summary.clean });
  return {
    durationInSeconds: summary.durationMs / 1000,
    accuracy,
    cpm: summary.cpm,
    wpm: summary.cpm / 5,
  };
}
