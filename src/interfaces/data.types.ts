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
  id: z.string().min(1, "ID cannot be empty"),
  verse: z.string().min(1, "Verse text cannot be empty"),
  langs: z.array(z.string().min(1, "Language code cannot be empty"))
          .min(1, "At least one language must be specified"),


  // Basic text statistics
  char_count: z.number().int().min(0, "Character count must be non-negative"),
  word_count: z.number().int().min(0, "Word count must be non-negative"),
  avg_word_length: z.number().min(0, "Average word length must be non-negative"),
  max_word_length: z.number().int().min(0, "Maximum word length must be non-negative"),

  // Character and n-gram analysis
  unique_chars: z.array(z.string().length(1, "Unique character must be a single character"))
                  .min(1, "Unique characters array cannot be empty for a non-empty verse"),
  unique_symbols: z.array(z.string().length(1, "Unique symbol must be a single character"))
                    .min(1, "Unique symbols array cannot be empty for a non-empty verse"),
  char_freq: z.record(z.string().length(1, "Char frequency key must be a single character"),
                      z.number().int().min(0, "Char frequency count must be non-negative")),
  symbol_freq: z.record(z.string().length(1, "Symbol frequency key must be a single character"),
                        z.number().int().min(0, "Symbol frequency count must be non-negative")),
  bigrams: z.array(z.string().length(2, "Bigram must be two characters"))
            .min(1, "Bigrams array cannot be empty for a non-empty verse"),
  trigrams: z.array(z.string().length(3, "Trigram must be three characters"))
             .min(1, "Trigrams array cannot be empty for a non-empty verse"),
});

export type Verse = z.infer<typeof VerseSchema>;
