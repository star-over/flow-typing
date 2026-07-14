import { describe, expect, it } from 'vitest';
import { normalizeSettings } from './settings';
import { DEFAULT_USER_SETTINGS } from '@/user-settings/defaults';

describe('normalizeSettings', () => {
  // Дефолты сверяем с источником истины (DEFAULT_USER_SETTINGS), а НЕ с
  // литералами: смена дефолта в коде не должна тянуть правку тестов. Тест
  // проверяет поведение (пусто/мусор → подстановка дефолта), а не конкретное
  // значение. Литералами остаются только не-дефолтные значения (пропуск
  // валидного входа) и производные (раскладка из языка).
  it('пустой объект → каскад дефолтов', () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('null → каскад дефолтов', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_USER_SETTINGS);
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

  it('валидный rhythmChannelEnabled сохраняется, не-boolean → дефолт', () => {
    expect(normalizeSettings({ rhythmChannelEnabled: true }).rhythmChannelEnabled).toBe(true);
    expect(normalizeSettings({ rhythmChannelEnabled: 'yes' }).rhythmChannelEnabled).toBe(
      DEFAULT_USER_SETTINGS.rhythmChannelEnabled,
    );
    expect(normalizeSettings({}).rhythmChannelEnabled).toBe(DEFAULT_USER_SETTINGS.rhythmChannelEnabled);
  });

  it('валидный sessionDurationSeconds сохраняется', () => {
    // Значения из набора опций, ОТЛИЧНЫЕ от дефолта — иначе «сохранился» не
    // отличить от «упал в дефолт».
    expect(normalizeSettings({ sessionDurationSeconds: 180 }).sessionDurationSeconds).toBe(180);
    expect(normalizeSettings({ sessionDurationSeconds: 300 }).sessionDurationSeconds).toBe(300);
    expect(normalizeSettings({ sessionDurationSeconds: 900 }).sessionDurationSeconds).toBe(900);
  });

  it('невалидный sessionDurationSeconds → дефолт', () => {
    const d = DEFAULT_USER_SETTINGS.sessionDurationSeconds;
    expect(normalizeSettings({}).sessionDurationSeconds).toBe(d);
    expect(normalizeSettings({ sessionDurationSeconds: 'ten' }).sessionDurationSeconds).toBe(d);
    expect(normalizeSettings({ sessionDurationSeconds: 30 }).sessionDurationSeconds).toBe(d);
    expect(normalizeSettings({ sessionDurationSeconds: 120 }).sessionDurationSeconds).toBe(d);
  });

  it('displayName: любая строка проходит как есть', () => {
    expect(normalizeSettings({ displayName: 'Алиса' }).displayName).toBe('Алиса');
    expect(normalizeSettings({ displayName: '' }).displayName).toBe('');
  });

  it('displayName: не-строка → дефолт', () => {
    expect(normalizeSettings({ displayName: 42 }).displayName).toBe(DEFAULT_USER_SETTINGS.displayName);
    expect(normalizeSettings({}).displayName).toBe(DEFAULT_USER_SETTINGS.displayName);
  });

  it('мусор в theme игнорируется и подставляется дефолт', () => {
    expect(normalizeSettings({ theme: 'neon' }).theme).toBe(DEFAULT_USER_SETTINGS.theme);
  });

  it('валидный fingerLayoutId сохраняется, мусор → дефолт', () => {
    expect(normalizeSettings({ fingerLayoutId: 'sdfv' }).fingerLayoutId).toBe('sdfv');
    expect(normalizeSettings({ fingerLayoutId: 'dvorak' }).fingerLayoutId).toBe(
      DEFAULT_USER_SETTINGS.fingerLayoutId,
    );
    expect(normalizeSettings({}).fingerLayoutId).toBe(DEFAULT_USER_SETTINGS.fingerLayoutId);
  });

  it('валидный cursorType сохраняется, мусор → дефолт', () => {
    expect(normalizeSettings({ cursorType: 'VERTICAL' }).cursorType).toBe('VERTICAL');
    expect(normalizeSettings({ cursorType: 'blink' }).cursorType).toBe(DEFAULT_USER_SETTINGS.cursorType);
    expect(normalizeSettings({}).cursorType).toBe(DEFAULT_USER_SETTINGS.cursorType);
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
    expect(normalizeSettings({ textLanguage: 'de' }).textLanguage).toBe(DEFAULT_USER_SETTINGS.textLanguage);
  });
});
