import { describe, expect, it } from 'vitest';
import { DrillSchema } from './drill-data.types';

const baseValidRu = {
  id: 'abc',
  text: 'Привет',
  textLanguage: 'ru',
  char_count: 6,
  word_count: 1,
  avg_word_length: 6,
  max_word_length: 6,
  unique_chars: ['п', 'р', 'и', 'в', 'е', 'т'],
  unique_symbols: ['П', 'р', 'и', 'в', 'е', 'т'],
  char_freq: { 'п': 1, 'р': 1, 'и': 1, 'в': 1, 'е': 1, 'т': 1 },
  symbol_freq: { 'П': 1, 'р': 1, 'и': 1, 'в': 1, 'е': 1, 'т': 1 },
  bigrams: ['Пр', 'ри', 'ив', 'ве', 'ет'],
  trigrams: ['При', 'рив', 'иве', 'вет'],
};

describe('DrillSchema', () => {
  it('валидный ru drill парсится', () => {
    expect(() => DrillSchema.parse(baseValidRu)).not.toThrow();
  });

  it('drill без textLanguage не парсится', () => {
    const { textLanguage: _t, ...withoutLang } = baseValidRu;
    expect(() => DrillSchema.parse(withoutLang)).toThrow();
  });

  it('drill с неизвестным textLanguage не парсится', () => {
    expect(() => DrillSchema.parse({ ...baseValidRu, textLanguage: 'de' })).toThrow();
  });

  it('ru drill с латиницей в unique_chars не парсится', () => {
    expect(() => DrillSchema.parse({
      ...baseValidRu,
      unique_chars: [...baseValidRu.unique_chars, 'a'],
    })).toThrow(/Latin/);
  });

  it('en drill с кириллицей в unique_chars не парсится', () => {
    expect(() => DrillSchema.parse({
      ...baseValidRu,
      textLanguage: 'en',
      unique_chars: ['h', 'e', 'l', 'o', 'и'],
    })).toThrow(/Cyrillic/);
  });

  it('en drill только с латиницей парсится', () => {
    expect(() => DrillSchema.parse({
      ...baseValidRu,
      text: 'hello',
      textLanguage: 'en',
      unique_chars: ['h', 'e', 'l', 'o'],
      unique_symbols: ['h', 'e', 'l', 'o'],
      char_freq: { 'h': 1, 'e': 1, 'l': 2, 'o': 1 },
      symbol_freq: { 'h': 1, 'e': 1, 'l': 2, 'o': 1 },
      bigrams: ['he', 'el', 'll', 'lo'],
      trigrams: ['hel', 'ell', 'llo'],
      char_count: 5,
      avg_word_length: 5,
      max_word_length: 5,
    })).not.toThrow();
  });
});
