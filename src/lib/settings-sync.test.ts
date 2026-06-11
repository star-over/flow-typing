import { describe, expect, test } from 'vitest';
import {
  cloudRowToSettings,
  decideSyncOnLogin,
  settingsToCloudArgs,
  type CloudSettings,
} from './settings-sync';
import type { UserSettings } from '@/interfaces/user-settings';

const validLocal: UserSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  theme: 'auto',
};

const validCloud: CloudSettings = {
  interfaceLanguage: 'ru',
  textLanguage: 'ru',
  symbolLayoutId: 'йцукен',
  theme: 'dark',
  updatedAt: 1000,
};

describe('decideSyncOnLogin', () => {
  test('cloudRow=null → push local settings (first sync / new user)', () => {
    const decision = decideSyncOnLogin({ cloudRow: null, localSettings: validLocal });
    expect(decision.action).toBe('push');
    expect(decision.settings).toEqual(validLocal);
  });

  test('cloudRow present → pull cloud (cloud wins)', () => {
    const decision = decideSyncOnLogin({ cloudRow: validCloud, localSettings: validLocal });
    expect(decision.action).toBe('pull');
    expect(decision.settings).toEqual({
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'йцукен',
      theme: 'dark',
    });
  });

  test('cloudRow present даже если equal to local → still pull (idempotent, no special case)', () => {
    const sameAsCloud: UserSettings = {
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'йцукен',
      theme: 'dark',
    };
    const decision = decideSyncOnLogin({ cloudRow: validCloud, localSettings: sameAsCloud });
    expect(decision.action).toBe('pull');
    expect(decision.settings).toEqual(sameAsCloud);
  });
});

describe('cloudRowToSettings', () => {
  test('valid cloud row → corresponding UserSettings shape (raw, без нормализации)', () => {
    const result = cloudRowToSettings(validCloud);
    expect(result).toEqual({
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'йцукен',
      theme: 'dark',
    });
  });

  test('strips _id / updatedAt / userId — только settings fields', () => {
    const result = cloudRowToSettings(validCloud);
    expect(Object.keys(result).sort()).toEqual([
      'interfaceLanguage',
      'symbolLayoutId',
      'textLanguage',
      'theme',
    ]);
  });

  test('does NOT normalize invalid values — это работа settings.set / normalizeSettings', () => {
    // Невалидные значения проходят через cloudRowToSettings как есть.
    // Нормализация случается «на входе» в store (settings.set → normalizeSettings).
    const result = cloudRowToSettings({
      ...validCloud,
      theme: 'neon-pink',
      symbolLayoutId: 'dvorak',
    });
    expect(result.theme).toBe('neon-pink');
    expect(result.symbolLayoutId).toBe('dvorak');
  });
});

describe('settingsToCloudArgs', () => {
  test('UserSettings → flat args shape (identity now, но typed boundary)', () => {
    const args = settingsToCloudArgs(validLocal);
    expect(args).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      theme: 'auto',
    });
  });

  test('does not include extra fields beyond 4 settings', () => {
    const args = settingsToCloudArgs(validLocal);
    expect(Object.keys(args).sort()).toEqual([
      'interfaceLanguage',
      'symbolLayoutId',
      'textLanguage',
      'theme',
    ]);
  });
});
