/**
 * @file Определения типов для структур данных, получаемых из внешних источников
 * (JSONL-корпус, в будущем — БД).
 */
import { z } from 'zod';
import { TEXT_LANGUAGES } from '@/interfaces/types';

const CYRILLIC_RE = /[а-яё]/i;
const LATIN_RE = /[a-z]/i;

export const DrillSchema = z.object({
  id: z.string().min(1, 'ID cannot be empty').describe('Уникальный идентификатор упражнения (SHA-1 хеш текста).'),
  text: z.string().min(1, 'Drill text cannot be empty').describe('Текст упражнения.'),
  textLanguage: z.enum(TEXT_LANGUAGES).describe('Язык текста упражнения (BCP 47).'),
  char_count: z.number().int().min(0).describe('Количество алфавитных символов.'),
  word_count: z.number().int().min(0).describe('Количество слов.'),
  avg_word_length: z.number().min(0).describe('Средняя длина слова.'),
  max_word_length: z.number().int().min(0).describe('Максимальная длина слова.'),
  unique_chars: z.array(z.string().length(1)).min(1).describe('Уникальные алфавитные символы (lowercase).'),
  unique_symbols: z.array(z.string().length(1)).min(1).describe('Уникальные символы текста.'),
  char_freq: z.record(z.string().length(1), z.number().int().min(0)).describe('Частотность алфавитных символов.'),
  symbol_freq: z.record(z.string().length(1), z.number().int().min(0)).describe('Частотность всех символов.'),
  bigrams: z.array(z.string().length(2)).min(1).describe('Биграммы текста.'),
  trigrams: z.array(z.string().length(3)).min(1).describe('Триграммы текста.'),
})
.refine(
  (d) => d.textLanguage !== 'ru' || !d.unique_chars.some(c => LATIN_RE.test(c)),
  { message: "drill with textLanguage='ru' must not contain Latin letters" }
)
.refine(
  (d) => d.textLanguage !== 'en' || !d.unique_chars.some(c => CYRILLIC_RE.test(c)),
  { message: "drill with textLanguage='en' must not contain Cyrillic letters" }
);

export type Drill = z.infer<typeof DrillSchema>;
