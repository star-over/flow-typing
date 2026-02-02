/**
 * @file Этот файл содержит определения типов для структур данных,
 * которые предполагается получать из внешних источников (например, БД, API).
 * В отличие от `types.ts`, который описывает внутренние типы приложения,
 * эти типы описывают "сырые" данные, на основе которых строится
 * состояние и логика приложения.
 */
import { z } from 'zod';

/**
 * A self-contained, layout-agnostic block of text used to generate lessons.
 * It contains pre-calculated, layout-independent statistics.
 * This represents a single document in our 'verses' collection/JSON file.
 */
export const VerseSchema = z.object({
  _id: z.string(),
  text: z.string(),
  languages: z.array(z.string()),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),

  // Basic text statistics
  char_count: z.number(),
  word_count: z.number(),
  avg_word_length: z.number(),
  max_word_length: z.number(),

  // Character and n-gram analysis
  unique_chars: z.array(z.string()),      // Case-insensitive unique characters
  unique_symbols: z.array(z.string()),    // Case-sensitive unique symbols
  char_freq: z.record(z.string(), z.number()),    // Case-insensitive character frequency
  symbol_freq: z.record(z.string(), z.number()),  // Case-sensitive symbol frequency
  bigrams: z.array(z.string()),
  trigrams: z.array(z.string()),
});

export type Verse = z.infer<typeof VerseSchema>;
