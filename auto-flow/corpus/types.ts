/**
 * @file Контракт выхода конвейера корпуса. Запись `DrillRecord` повторяет форму
 * таблицы `drills` в `convex/schema.ts` (без `_id`/`_creationTime`, которые
 * Convex проставляет сам). Вся мета — чистая функция текста, нейтральна к
 * раскладке.
 */

export interface DrillRecord {
  /** Что печатает пользователь. */
  text: string;
  /** Число символов для печати — бюджет порции. */
  length: number;
  /** Уникальные символы — членство «символы ⊆ раскладка» + индекс доступности. */
  uniqueSymbols: string[];
  /** Число слов — ручка «целевая длина слова». */
  wordCount: number;
  /** Средняя длина слова. */
  avgWordLength: number;
  /** Максимальная длина слова. */
  maxWordLength: number;
  /** Уникальные пары букв — ранжирование по слабым парам (этап «Фокус»). */
  bigrams: string[];
  /** Частотность символов — плотность для фокус-ранжирования. */
  symbolFrequency: Record<string, number>;
}

/** Отчёт покрытия: какие символы раскладки корпус покрывает, а какие нет. */
export interface CoverageReport {
  covered: string[];
  missing: string[];
}
