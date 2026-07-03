import { describe, expect, test } from 'vitest';
import {
  cloudRowToSettings,
  coordinateSync,
  decideSyncOnLogin,
  initialSyncCoordinatorState,
  settingsToCloudArgs,
  type CloudSettings,
  type SyncCoordinatorState,
  type SyncEffect,
  type SyncEvent,
} from './settings-sync';
import type { UserSettings } from '@/interfaces/user-settings';

const validLocal: UserSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  fingerLayoutId: 'asdf',
  cursorType: 'RECTANGLE',
  theme: 'auto',
  displayName: '',
  rhythmChannelEnabled: false,
};

const validCloud: CloudSettings = {
  interfaceLanguage: 'ru',
  textLanguage: 'ru',
  symbolLayoutId: 'йцукен',
  fingerLayoutId: 'sdfv',
  cursorType: 'VERTICAL',
  theme: 'dark',
  rhythmChannelEnabled: true,
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
      fingerLayoutId: 'sdfv',
      cursorType: 'VERTICAL',
      theme: 'dark',
      displayName: '',
      rhythmChannelEnabled: true,
    });
  });

  test('cloudRow present даже если equal to local → still pull (idempotent, no special case)', () => {
    const sameAsCloud: UserSettings = {
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'йцукен',
      fingerLayoutId: 'sdfv',
      cursorType: 'VERTICAL',
      theme: 'dark',
      displayName: '',
      rhythmChannelEnabled: true,
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
      fingerLayoutId: 'sdfv',
      cursorType: 'VERTICAL',
      theme: 'dark',
      displayName: '',
      rhythmChannelEnabled: true,
    });
  });

  test('strips _id / updatedAt / userId — только settings fields', () => {
    const result = cloudRowToSettings(validCloud);
    expect(Object.keys(result).sort()).toEqual([
      'cursorType',
      'displayName',
      'fingerLayoutId',
      'interfaceLanguage',
      'rhythmChannelEnabled',
      'symbolLayoutId',
      'textLanguage',
      'theme',
    ]);
  });

  test('displayName: present → проходит; absent (legacy row) → дефолт пустая строка', () => {
    expect(cloudRowToSettings({ ...validCloud, displayName: 'Алиса' }).displayName).toBe('Алиса');
    expect(cloudRowToSettings(validCloud).displayName).toBe('');
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
      fingerLayoutId: 'asdf',
      cursorType: 'RECTANGLE',
      theme: 'auto',
      displayName: '',
      rhythmChannelEnabled: false,
    });
  });

  test('does not include extra fields beyond the known settings', () => {
    const args = settingsToCloudArgs(validLocal);
    expect(Object.keys(args).sort()).toEqual([
      'cursorType',
      'displayName',
      'fingerLayoutId',
      'interfaceLanguage',
      'rhythmChannelEnabled',
      'symbolLayoutId',
      'textLanguage',
      'theme',
    ]);
  });
});

describe('coordinateSync', () => {
  // Прогоняет последовательность событий, тред'ая состояние; собирает все эффекты
  // в порядке появления. Эхо settings.set (SETTINGS_EMITTED после SET_LOCAL) —
  // свойство runner'а, в pure-тесте эмулируется явным SETTINGS_EMITTED.
  function run(
    events: SyncEvent[],
    from: SyncCoordinatorState = initialSyncCoordinatorState,
  ): { state: SyncCoordinatorState; effects: SyncEffect[] } {
    let state = from;
    const effects: SyncEffect[] = [];
    for (const event of events) {
      const result = coordinateSync({ state, event });
      state = result.state;
      effects.push(...result.effects);
    }
    return { state, effects };
  }

  const editedLocal: UserSettings = { ...validLocal, theme: 'dark' };

  test('первый SETTINGS_EMITTED (writable стреляет на подписке) — не пушит (no-push-on-init)', () => {
    const { state, effects } = run([{ type: 'SETTINGS_EMITTED', value: validLocal }]);
    expect(effects).toEqual([]);
    expect(state.awaitingInitialEmit).toBe(false);
  });

  test('AUTH_CHANGED(loading) — no-op, не PULL и не сброс one-shot', () => {
    const { state, effects } = run([{ type: 'AUTH_CHANGED', status: 'loading' }]);
    expect(effects).toEqual([]);
    expect(state.loginSyncDone).toBe(false);
  });

  test('login при authenticated → один PULL, loginSyncDone выставлен сразу (до получения ответа)', () => {
    const { state, effects } = run([
      { type: 'SETTINGS_EMITTED', value: validLocal },
      { type: 'AUTH_CHANGED', status: 'authenticated' },
    ]);
    expect(effects).toEqual([{ type: 'PULL' }]);
    expect(state.loginSyncDone).toBe(true);
  });

  test('PULL_RESOLVED с cloud → SET_LOCAL + skipNextEcho; следующий emit (эхо) не пушит (no-echo)', () => {
    const afterAuth = run([
      { type: 'SETTINGS_EMITTED', value: validLocal },
      { type: 'AUTH_CHANGED', status: 'authenticated' },
    ]);
    const afterPull = coordinateSync({
      state: afterAuth.state,
      event: { type: 'PULL_RESOLVED', cloudRow: validCloud, localSettings: validLocal },
    });
    expect(afterPull.effects).toEqual([
      { type: 'SET_LOCAL', settings: cloudRowToSettings(validCloud) },
    ]);
    expect(afterPull.state.skipNextEcho).toBe(true);

    const afterEcho = coordinateSync({
      state: afterPull.state,
      event: { type: 'SETTINGS_EMITTED', value: cloudRowToSettings(validCloud) },
    });
    expect(afterEcho.effects).toEqual([]);
    expect(afterEcho.state.skipNextEcho).toBe(false);
  });

  test('PULL_RESOLVED с пустым cloud → PUSH локальных настроек (first sync), без skipNextEcho', () => {
    const afterAuth = run([
      { type: 'SETTINGS_EMITTED', value: validLocal },
      { type: 'AUTH_CHANGED', status: 'authenticated' },
    ]);
    const afterPull = coordinateSync({
      state: afterAuth.state,
      event: { type: 'PULL_RESOLVED', cloudRow: null, localSettings: validLocal },
    });
    expect(afterPull.effects).toEqual([{ type: 'PUSH', args: settingsToCloudArgs(validLocal) }]);
    expect(afterPull.state.skipNextEcho).toBe(false);
  });

  test('token-refresh flicker (authenticated→loading→authenticated) не повторяет PULL (single-session)', () => {
    const { state, effects } = run([
      { type: 'SETTINGS_EMITTED', value: validLocal },
      { type: 'AUTH_CHANGED', status: 'authenticated' },
      { type: 'AUTH_CHANGED', status: 'loading' },
      { type: 'AUTH_CHANGED', status: 'authenticated' },
    ]);
    expect(effects).toEqual([{ type: 'PULL' }]);
    expect(state.loginSyncDone).toBe(true);
  });

  test('PULL_FAILED сбрасывает loginSyncDone → следующий authenticated повторяет PULL (retry)', () => {
    const afterAuth = run([
      { type: 'SETTINGS_EMITTED', value: validLocal },
      { type: 'AUTH_CHANGED', status: 'authenticated' },
    ]);
    const afterFail = coordinateSync({ state: afterAuth.state, event: { type: 'PULL_FAILED' } });
    expect(afterFail.effects).toEqual([]);
    expect(afterFail.state.loginSyncDone).toBe(false);

    const afterRetry = coordinateSync({
      state: afterFail.state,
      event: { type: 'AUTH_CHANGED', status: 'authenticated' },
    });
    expect(afterRetry.effects).toEqual([{ type: 'PULL' }]);
  });

  test('локальная правка при authenticated → PUSH в порядке события (in-order push)', () => {
    const { effects } = run([
      { type: 'SETTINGS_EMITTED', value: validLocal },
      { type: 'AUTH_CHANGED', status: 'authenticated' },
      { type: 'PULL_RESOLVED', cloudRow: null, localSettings: validLocal },
      { type: 'SETTINGS_EMITTED', value: editedLocal },
    ]);
    expect(effects.at(-1)).toEqual({ type: 'PUSH', args: settingsToCloudArgs(editedLocal) });
  });

  test('guest сбрасывает loginSyncDone и шлёт CANCEL_PUSH_CHAIN', () => {
    const afterAuth = run([
      { type: 'SETTINGS_EMITTED', value: validLocal },
      { type: 'AUTH_CHANGED', status: 'authenticated' },
    ]);
    const afterGuest = coordinateSync({
      state: afterAuth.state,
      event: { type: 'AUTH_CHANGED', status: 'guest' },
    });
    expect(afterGuest.effects).toEqual([{ type: 'CANCEL_PUSH_CHAIN' }]);
    expect(afterGuest.state.loginSyncDone).toBe(false);
    expect(afterGuest.state.authStatus).toBe('guest');
  });

  test('после guest повторный login снова делает one-shot PULL', () => {
    const { effects } = run([
      { type: 'SETTINGS_EMITTED', value: validLocal },
      { type: 'AUTH_CHANGED', status: 'authenticated' },
      { type: 'AUTH_CHANGED', status: 'guest' },
      { type: 'AUTH_CHANGED', status: 'authenticated' },
    ]);
    expect(effects.filter(e => e.type === 'PULL')).toHaveLength(2);
  });

  test('локальная правка пока не authenticated — не пушит (push gating)', () => {
    const { effects } = run([
      { type: 'SETTINGS_EMITTED', value: validLocal },
      { type: 'AUTH_CHANGED', status: 'guest' },
      { type: 'SETTINGS_EMITTED', value: editedLocal },
    ]);
    expect(effects).toEqual([{ type: 'CANCEL_PUSH_CHAIN' }]);
  });
});
