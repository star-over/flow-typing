import { describe, expect, it } from 'vitest';
import { normalizeSettings } from './settings';

describe('normalizeSettings', () => {
  it('пустой объект → каскад дефолтов', () => {
    const result = normalizeSettings({});
    expect(result).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      theme: 'auto',
      displayName: '',
    });
  });

  it('null → каскад дефолтов', () => {
    expect(normalizeSettings(null)).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      theme: 'auto',
      displayName: '',
    });
  });

  it('частичный: только textLanguage → подставляется дефолтная раскладка', () => {
    const result = normalizeSettings({ textLanguage: 'ru' });
    expect(result.interfaceLanguage).toBe('en');
    expect(result.textLanguage).toBe('ru');
    expect(result.symbolLayoutId).toBe('йцукен');
  });

  it('полный совместимый → как есть', () => {
    const input = {
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'йцукен',
      theme: 'dark',
      displayName: 'Custom Name',
    };
    expect(normalizeSettings(input)).toEqual(input);
  });

  it('displayName: любая строка проходит как есть', () => {
    expect(normalizeSettings({ displayName: 'Алиса' }).displayName).toBe('Алиса');
    expect(normalizeSettings({ displayName: '' }).displayName).toBe('');
  });

  it('displayName: не-строка → пустая строка по умолчанию', () => {
    expect(normalizeSettings({ displayName: 42 }).displayName).toBe('');
    expect(normalizeSettings({}).displayName).toBe('');
  });

  it('мусор в theme игнорируется и подставляется дефолт', () => {
    const result = normalizeSettings({ theme: 'neon' });
    expect(result.theme).toBe('auto');
  });

  it('несовместимая пара textLanguage=ru + symbolLayoutId=qwerty → сброс раскладки', () => {
    const result = normalizeSettings({
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'qwerty',
    });
    expect(result.symbolLayoutId).toBe('йцукен');
  });

  it('legacy `language` поле игнорируется (не читается как interfaceLanguage)', () => {
    const result = normalizeSettings({
      language: 'ru',
      symbolLayoutId: 'йцукен',
    });
    expect(result.interfaceLanguage).toBe('en');
    expect(result.textLanguage).toBe('en');
    expect(result.symbolLayoutId).toBe('qwerty');
  });

  it('мусор в textLanguage игнорируется и подставляется дефолт', () => {
    const result = normalizeSettings({ textLanguage: 'de' });
    expect(result.textLanguage).toBe('en');
  });
});
