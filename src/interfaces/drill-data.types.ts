/**
 * @file Этот файл содержит определения типов для структур данных,
 * которые предполагается получать из внешних источников (например, БД, API).
 * В отличие от `types.ts`, который описывает внутренние типы приложения,
 * эти типы описывают "сырые" данные, на основе которых строится
 * состояние и логика приложения.
 */
import { z } from 'zod';

/**
 * A self-contained, layout-agnostic block of text used to generate a TypingStream for a lesson.
 * It contains pre-calculated, layout-independent statistics.
 * This represents a single document in our 'drills' collection/JSON file.
 */
export const DrillSchema = z.object({
  id: z.string().min(1, "ID cannot be empty").describe("Уникальный идентификатор упражнения (SHA-1 хеш текста)."),
  text: z.string().min(1, "Drill text cannot be empty").describe("Само текстовое содержимое упражнения."),


  // Basic text statistics
  char_count: z.number().int().min(0, "Character count must be non-negative").describe("Общее количество алфавитных символов в упражнении."),
  word_count: z.number().int().min(0, "Word count must be non-negative").describe("Общее количество слов в упражнении."),
  avg_word_length: z.number().min(0, "Average word length must be non-negative").describe("Средняя длина слов в упражнении."),
  max_word_length: z.number().int().min(0, "Maximum word length must be non-negative").describe("Максимальная длина любого слова в упражнении."),

  // Character and n-gram analysis
  unique_chars: z.array(z.string().length(1, "Unique character must be a single character"))
                  .min(1, "Unique characters array cannot be empty for a non-empty drill")
                  .describe("Массив уникальных алфавитных символов (в нижнем регистре), присутствующих в упражнении."),
  unique_symbols: z.array(z.string().length(1, "Unique symbol must be a single character"))
                    .min(1, "Unique symbols array cannot be empty for a non-empty drill")
                    .describe("Массив уникальных символов (всех символов), присутствующих в упражнении."),
  char_freq: z.record(z.string().length(1, "Char frequency key must be a single character"),
                      z.number().int().min(0, "Char frequency count must be non-negative"))
                      .describe("Карта частотности алфавитных символов (в нижнем регистре) в упражнении."),
  symbol_freq: z.record(z.string().length(1, "Symbol frequency key must be a single character"),
                        z.number().int().min(0, "Symbol frequency count must be non-negative"))
                        .describe("Карта частотности всех символов в упражнении."),
  bigrams: z.array(z.string().length(2, "Bigram must be two characters"))
            .min(1, "Bigrams array cannot be empty for a non-empty drill")
            .describe("Массив двухсимвольных последовательностей (биграмм), найденных в упражнении."),
  trigrams: z.array(z.string().length(3, "Trigram must be three characters"))
             .min(1, "Trigrams array cannot be empty for a non-empty drill")
             .describe("Массив трехсимвольных последовательностей (триграмм), найденных в упражнении."),
});

export type Drill = z.infer<typeof DrillSchema>;
