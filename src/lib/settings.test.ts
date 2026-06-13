import { describe, expect, it } from 'vitest';
import { normalizeSettings } from './settings';

describe('normalizeSettings', () => {
  it('пустой объект → каскад дефолтов', () => {
    const result = normalizeSettings({});
    expect(result).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      fingerLayoutId: 'asdf',
      cursorType: 'RECTANGLE',
      cursorMode: 'HALF',
      theme: 'auto',
    });
  });

  it('null → каскад дефолтов', () => {
    expect(normalizeSettings(null)).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      fingerLayoutId: 'asdf',
      cursorType: 'RECTANGLE',
      cursorMode: 'HALF',
      theme: 'auto',
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
      fingerLayoutId: 'sdfv',
      cursorType: 'VERTICAL',
      cursorMode: 'THIRD',
      theme: 'dark',
    };
    expect(normalizeSettings(input)).toEqual(input);
  });

  it('мусор в theme игнорируется и подставляется дефолт', () => {
    const result = normalizeSettings({ theme: 'neon' });
    expect(result.theme).toBe('auto');
  });

  it('валидный fingerLayoutId сохраняется, мусор → дефолт asdf', () => {
    expect(normalizeSettings({ fingerLayoutId: 'sdfv' }).fingerLayoutId).toBe('sdfv');
    expect(normalizeSettings({ fingerLayoutId: 'dvorak' }).fingerLayoutId).toBe('asdf');
    expect(normalizeSettings({}).fingerLayoutId).toBe('asdf');
  });

  it('валидный cursorType сохраняется, мусор → дефолт RECTANGLE', () => {
    expect(normalizeSettings({ cursorType: 'VERTICAL' }).cursorType).toBe('VERTICAL');
    expect(normalizeSettings({ cursorType: 'blink' }).cursorType).toBe('RECTANGLE');
    expect(normalizeSettings({}).cursorType).toBe('RECTANGLE');
  });

  it('валидный cursorMode сохраняется, мусор → дефолт HALF', () => {
    expect(normalizeSettings({ cursorMode: 'QUARTER' }).cursorMode).toBe('QUARTER');
    expect(normalizeSettings({ cursorMode: 'FULL' }).cursorMode).toBe('HALF');
    expect(normalizeSettings({}).cursorMode).toBe('HALF');
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
