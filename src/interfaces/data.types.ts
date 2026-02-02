/**
 * @file Этот файл содержит определения типов для структур данных,
 * которые предполагается получать из внешних источников (например, БД, API).
 * В отличие от `types.ts`, который описывает внутренние типы приложения,
 * эти типы описывают "сырые" данные, на основе которых строится
 * состояние и логика приложения.
 */

/**
 * A self-contained, layout-agnostic block of text used to generate lessons.
 * It contains pre-calculated, layout-independent statistics.
 * This represents a single document in our 'verses' collection/JSON file.
 */
export type Verse = {
  _id: string;
  text: string;
  languages: string[];
  source?: string;
  tags?: string[];

  // Basic text statistics
  char_count: number;
  word_count: number;
  avg_word_length: number;
  max_word_length: number;

  // Character and n-gram analysis
  unique_chars: string[];      // Case-insensitive unique characters
  unique_symbols: string[];    // Case-sensitive unique symbols
  char_freq: Record<string, number>;    // Case-insensitive character frequency
  symbol_freq: Record<string, number>;  // Case-sensitive symbol frequency
  bigrams: string[];
  trigrams: string[];
};
