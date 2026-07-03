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
      theme: 'auto',
      displayName: '',
      rhythmChannelEnabled: false,
      sessionDurationSeconds: 300,
    });
  });

  it('null → каскад дефолтов', () => {
    expect(normalizeSettings(null)).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      fingerLayoutId: 'asdf',
      cursorType: 'RECTANGLE',
      theme: 'auto',
      displayName: '',
      rhythmChannelEnabled: false,
      sessionDurationSeconds: 300,
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
      theme: 'dark',
      displayName: 'Custom Name',
      rhythmChannelEnabled: true,
      sessionDurationSeconds: 600,
    };
    expect(normalizeSettings(input)).toEqual(input);
  });

  it('валидный rhythmChannelEnabled сохраняется, не-boolean → дефолт false', () => {
    expect(normalizeSettings({ rhythmChannelEnabled: true }).rhythmChannelEnabled).toBe(true);
    expect(normalizeSettings({ rhythmChannelEnabled: 'yes' }).rhythmChannelEnabled).toBe(false);
    expect(normalizeSettings({}).rhythmChannelEnabled).toBe(false);
  });

  it('валидный sessionDurationSeconds сохраняется, не-число → дефолт 300', () => {
    expect(normalizeSettings({ sessionDurationSeconds: 600 }).sessionDurationSeconds).toBe(600);
    expect(normalizeSettings({ sessionDurationSeconds: 'ten' }).sessionDurationSeconds).toBe(300);
    expect(normalizeSettings({}).sessionDurationSeconds).toBe(300);
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
