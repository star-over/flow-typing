/**
 * @file Шаг 5 конвейера: подсчёт меты упражнения (форма `DrillRecord` без
 * `text`). Спасено из старого `drill-utils` без триграмм, SHA-1-id и
 * дублирующего «алфавитного» среза частот. Чистая функция текста.
 */
import type { DrillRecord, SymbolCount } from './types.ts';

export type DrillMeta = Omit<DrillRecord, 'text'>;

const LETTER_RE = /\p{L}/u;

/** Слова: по пробелам, оставляем только буквы (пунктуация внутри слова срезается). */
function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => [...word].filter((c) => LETTER_RE.test(c)).join(''))
    .filter((word) => word.length > 0);
}

function uniqueSorted(chars: string[]): string[] {
  return [...new Set(chars)].sort();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function symbolFrequency(chars: string[]): SymbolCount[] {
  const counts = new Map<string, number>();
  for (const char of chars) counts.set(char, (counts.get(char) ?? 0) + 1);
  return [...counts].map(([symbol, count]) => ({ symbol, count }));
}

/** Уникальные соседние пары букв (оба символа — буквы), в нижнем регистре. */
function letterBigrams(text: string): string[] {
  const chars = [...text.toLowerCase()];
  const pairs = new Set<string>();
  for (let i = 0; i < chars.length - 1; i++) {
    const a = chars[i];
    const b = chars[i + 1];
    if (a && b && LETTER_RE.test(a) && LETTER_RE.test(b)) pairs.add(a + b);
  }
  return [...pairs].sort();
}

export function computeMeta(text: string): DrillMeta {
  const chars = [...text];
  const wordLengths = extractWords(text).map((word) => [...word].length);
  const totalWordLength = wordLengths.reduce((sum, length) => sum + length, 0);

  return {
    length: chars.length,
    uniqueSymbols: uniqueSorted(chars),
    wordCount: wordLengths.length,
    avgWordLength: wordLengths.length ? round2(totalWordLength / wordLengths.length) : 0,
    maxWordLength: wordLengths.length ? Math.max(...wordLengths) : 0,
    bigrams: letterBigrams(text),
    symbolFrequency: symbolFrequency(chars),
  };
}
