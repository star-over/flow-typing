import { describe, expect, it } from 'vitest';
import { normalizePreferences } from './preferences';

describe('normalizePreferences', () => {
  it('пустой объект → каскад дефолтов', () => {
    const result = normalizePreferences({});
    expect(result).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      shared: {},
    });
  });

  it('null → каскад дефолтов', () => {
    expect(normalizePreferences(null)).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      shared: {},
    });
  });

  it('частичный: только textLanguage → подставляется дефолтная раскладка', () => {
    const result = normalizePreferences({ textLanguage: 'ru' });
    expect(result.interfaceLanguage).toBe('en');
    expect(result.textLanguage).toBe('ru');
    expect(result.symbolLayoutId).toBe('йцукен');
  });

  it('полный совместимый → как есть', () => {
    const input = {
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'йцукен',
      shared: { exerciseId: 'x' },
    };
    expect(normalizePreferences(input)).toEqual(input);
  });

  it('несовместимая пара textLanguage=ru + symbolLayoutId=qwerty → сброс раскладки', () => {
    const result = normalizePreferences({
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'qwerty',
    });
    expect(result.symbolLayoutId).toBe('йцукен');
  });

  it('legacy `language` поле игнорируется (не читается как interfaceLanguage)', () => {
    const result = normalizePreferences({
      language: 'ru',
      symbolLayoutId: 'йцукен',
    });
    // language не должен быть прочитан, interfaceLanguage берётся дефолт 'en'
    expect(result.interfaceLanguage).toBe('en');
    // textLanguage = interfaceLanguage = 'en'
    expect(result.textLanguage).toBe('en');
    // symbolLayoutId='йцукен' несовместим с en → сброс на qwerty
    expect(result.symbolLayoutId).toBe('qwerty');
  });

  it('мусор в textLanguage игнорируется и подставляется дефолт', () => {
    const result = normalizePreferences({ textLanguage: 'de' });
    expect(result.textLanguage).toBe('en');
  });
});
