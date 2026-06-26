// src/lib/stats-calculator.ts
/**
 * @file Числа статистики упражнения для экрана результатов (LessonStatsDisplay).
 * Источник — КАНОНИЧЕСКАЯ SessionSummaryPayload (та же, что пишется в журнал
 * sessionSummaries), а не «настенное» время по attempts: длительность —
 * активное время за вычетом пауз (displayElapsedMs, ≤ окна), посчитанное в
 * sessionMachine. Значения отдаём СЫРЫМИ — округляет уже отображающий слой, ровно
 * как formatSessionRow для строки /stats, поэтому числа на двух экранах совпадают.
 */
import type { SessionSummaryPayload } from './session-summarize';

export interface LessonStats {
  durationInSeconds: number;
  accuracy: number; // процент: clean / exposures * 100 (как в журнале)
  cpm: number; // знаков в минуту (пропускная способность за активную минуту)
  wpm: number; // слов в минуту = cpm / 5
}

/** Сводка завершённой сессии → числа карточки результатов. Сырые, без округления. */
export function lessonStatsFromSummary(summary: SessionSummaryPayload): LessonStats {
  const accuracy = summary.exposures > 0 ? (summary.clean / summary.exposures) * 100 : 0;
  return {
    durationInSeconds: summary.durationMs / 1000,
    accuracy,
    cpm: summary.cpm,
    wpm: summary.cpm / 5,
  };
}
