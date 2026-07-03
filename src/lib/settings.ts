import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
  FINGER_LAYOUT_IDS,
  FLOW_LINE_CURSOR_TYPES,
  INTERFACE_LANGUAGES,
  SYMBOL_LAYOUT_IDS,
  TEXT_LANGUAGES,
  type FingerLayoutId,
  type FlowLineCursorType,
  type InterfaceLanguage,
  type SymbolLayoutId,
  type TextLanguage,
} from '@/interfaces/types';
import type { UserSettings } from '@/interfaces/user-settings';
import { DEFAULT_USER_SETTINGS } from '@/user-settings/user-settings';
import {
  getCompatibleSymbolLayoutsForTextLanguage,
  getDefaultSymbolLayoutForTextLanguage,
} from '@/lib/layouts';
import { isThemeSetting, type ThemeSetting } from '@/themes/registry';
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
import {
  coordinateSync,
  initialSyncCoordinatorState,
  type CloudSettings,
  type settingsToCloudArgs,
  type SyncEffect,
  type SyncEvent,
} from './settings-sync';

const STORAGE_KEY = 'flow-typing-user-settings';
const THEME_STORAGE_KEY = 'flow-typing-theme';

function isInterfaceLanguage(v: unknown): v is InterfaceLanguage {
  return typeof v === 'string' && (INTERFACE_LANGUAGES as readonly string[]).includes(v);
}
function isTextLanguage(v: unknown): v is TextLanguage {
  return typeof v === 'string' && (TEXT_LANGUAGES as readonly string[]).includes(v);
}
function isSymbolLayoutId(v: unknown): v is SymbolLayoutId {
  return typeof v === 'string' && (SYMBOL_LAYOUT_IDS as readonly string[]).includes(v);
}
function isFingerLayoutId(v: unknown): v is FingerLayoutId {
  return typeof v === 'string' && (FINGER_LAYOUT_IDS as readonly string[]).includes(v);
}
function isCursorType(v: unknown): v is FlowLineCursorType {
  return typeof v === 'string' && (FLOW_LINE_CURSOR_TYPES as readonly string[]).includes(v);
}

function isSymbolLayoutCompatibleWithTextLanguage({
  symbolLayoutId,
  textLanguage,
}: {
  symbolLayoutId: SymbolLayoutId;
  textLanguage: TextLanguage;
}): boolean {
  return getCompatibleSymbolLayoutsForTextLanguage(textLanguage)
    .some(d => d.symbolLayoutId === symbolLayoutId);
}

/**
 * Приводит произвольное содержимое localStorage к валидному UserSettings,
 * заполняя пропуски по каскаду interfaceLanguage → textLanguage → symbolLayoutId.
 * Legacy ключи (например, старый `language`) игнорируются.
 */
export function normalizeSettings(raw: unknown): UserSettings {
  const stored = (raw ?? {}) as Record<string, unknown>;

  const interfaceLanguage = isInterfaceLanguage(stored.interfaceLanguage)
    ? stored.interfaceLanguage
    : DEFAULT_USER_SETTINGS.interfaceLanguage;

  const textLanguage: TextLanguage = isTextLanguage(stored.textLanguage)
    ? stored.textLanguage
    : interfaceLanguage;

  const candidate = isSymbolLayoutId(stored.symbolLayoutId) ? stored.symbolLayoutId : undefined;
  const symbolLayoutId: SymbolLayoutId =
    candidate &&
    isSymbolLayoutCompatibleWithTextLanguage({ symbolLayoutId: candidate, textLanguage })
      ? candidate
      : getDefaultSymbolLayoutForTextLanguage(textLanguage).symbolLayoutId;

  // fingerLayoutId независим от языкового каскада — простой fallback на дефолт.
  const fingerLayoutId: FingerLayoutId = isFingerLayoutId(stored.fingerLayoutId)
    ? stored.fingerLayoutId
    : DEFAULT_USER_SETTINGS.fingerLayoutId;

  const cursorType: FlowLineCursorType = isCursorType(stored.cursorType)
    ? stored.cursorType
    : DEFAULT_USER_SETTINGS.cursorType;

  const theme: ThemeSetting = isThemeSetting(stored.theme)
    ? stored.theme
    : DEFAULT_USER_SETTINGS.theme;

  // Свободная строка — любое имя валидно; не-строка → дефолт (пустая строка).
  const displayName = typeof stored.displayName === 'string'
    ? stored.displayName
    : DEFAULT_USER_SETTINGS.displayName;

  // Булев флаг; не-boolean (legacy/cloud без поля) → дефолт (выключено).
  const rhythmChannelEnabled = typeof stored.rhythmChannelEnabled === 'boolean'
    ? stored.rhythmChannelEnabled
    : DEFAULT_USER_SETTINGS.rhythmChannelEnabled;

  // Длительность таймерной сессии в секундах; не-число → дефолт (5 минут).
  const sessionDurationSeconds = typeof stored.sessionDurationSeconds === 'number'
    ? stored.sessionDurationSeconds
    : DEFAULT_USER_SETTINGS.sessionDurationSeconds;

  return {
    interfaceLanguage,
    textLanguage,
    symbolLayoutId,
    fingerLayoutId,
    cursorType,
    theme,
    displayName,
    rhythmChannelEnabled,
    sessionDurationSeconds,
  };
}

function safeJsonParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

function createSettingsStore() {
  const load = (): UserSettings => {
    if (!browser) return { ...DEFAULT_USER_SETTINGS };
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? safeJsonParse(raw) : null;
    return normalizeSettings(parsed);
  };

  const store = writable<UserSettings>(load());

  store.subscribe((value) => {
    if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  });

  // Mirror-key для FOUC-free bootstrap: inline-script в `src/app.html` читает
  // именно его до paint. Единственный источник записи — этот subscriber.
  store.subscribe((value) => {
    if (browser) localStorage.setItem(THEME_STORAGE_KEY, value.theme);
  });

  return {
    subscribe: store.subscribe,
    update: (fn: (current: UserSettings) => UserSettings) =>
      store.update(current => normalizeSettings(fn(current))),
    set: (value: UserSettings) => store.set(normalizeSettings(value)),
  };
}

export const settings = createSettingsStore();

export function updateSettings(partial: Partial<UserSettings>) {
  settings.update((current) => ({ ...current, ...partial }));
}

/**
 * Connect settings store к Convex backend для cross-device sync.
 *
 * Вызывать ОДИН раз из root layout, после createAuthStore. Возвращаемый объект:
 * - `notifyAuthChanged()` — вызывать из layout-effect'а на каждое изменение
 *   `authStore.state.status`. Internal-guard'ы решают, делать ли pull/push.
 * - `dispose()` — вызывать в onDestroy layout'а.
 *
 * Координационные решения (эхо, гонки, one-shot) живут в чистом reducer
 * `coordinateSync` (settings-sync.ts) и покрыты тестами; эта функция — тонкий
 * effect-runner поверх него: транслирует мир в события, исполняет эффекты,
 * держит `pushChain` (Promise-цепочку — побочный эффект, не решение).
 *
 * Гарантии (проверяются в reducer):
 * - Ни pull, ни push не делается, пока authStore не в 'authenticated'. Гость живёт
 *   исключительно в localStorage (текущее Phase 4 поведение).
 * - **Single-session sync.** Pull/push при login-sync делается один раз за
 *   authentication session (`loginSyncDone`). Token-refresh flicker
 *   (`authenticated → loading → authenticated` без logout) НЕ вызывает повторный
 *   pull, что защищает pending local edit от перетирания.
 * - **In-order push.** Все push'и идут через `pushChain` Promise — Convex видит
 *   их в порядке user-actions даже если network reorder'ит requests.
 * - **Retry on failure.** Pull throw в login-sync сбрасывает `loginSyncDone`
 *   → следующий state-tick / mount / local-edit повторит попытку.
 */
export function attachCloudSync({
  authStore,
  pullCloud,
  pushCloud,
}: {
  authStore: AuthStore;
  pullCloud: () => Promise<CloudSettings | null>;
  pushCloud: (args: ReturnType<typeof settingsToCloudArgs>) => Promise<unknown>;
}): { notifyAuthChanged: () => void; dispose: () => void } {
  let state = initialSyncCoordinatorState;
  // Serialized push chain — гарантия порядка отправки даже при network reorder.
  // Это побочный эффект (Promise-сериализация), а не решение — потому живёт здесь, в runner'е.
  let pushChain: Promise<unknown> = Promise.resolve();

  function enqueuePush(args: ReturnType<typeof settingsToCloudArgs>) {
    pushChain = pushChain.catch(() => { /* проглотить ошибку предыдущего звена цепочки */ }).then(() => pushCloud(args));
    pushChain.catch(() => {
      if (import.meta.env.DEV) {

        console.warn('[settings-sync] push failed (will retry on next change)');
      }
    });
  }

  function currentSettingsSnapshot(): UserSettings {
    let snapshot!: UserSettings;
    settings.subscribe(v => { snapshot = v; })();
    return snapshot;
  }

  function runPull() {
    void (async () => {
      try {
        const cloudRow = await pullCloud();
        dispatch({ type: 'PULL_RESOLVED', cloudRow, localSettings: currentSettingsSnapshot() });
      } catch (e) {
        dispatch({ type: 'PULL_FAILED' });
        if (import.meta.env.DEV) {

          console.warn('[settings-sync] login-sync failed (will retry)', e);
        }
      }
    })();
  }

  function runEffects(effects: SyncEffect[]) {
    for (const effect of effects) {
      switch (effect.type) {
        case 'PULL':
          runPull();
          break;
        case 'PUSH':
          enqueuePush(effect.args);
          break;
        case 'SET_LOCAL':
          settings.set(effect.settings);
          break;
        case 'CANCEL_PUSH_CHAIN':
          // Defense-in-depth: если pending push не успел уйти до logout, он ушёл бы
          // под expired token (Convex 401 → catch eats). Cancel явно избегает шума.
          pushChain = Promise.resolve();
          break;
      }
    }
  }

  // Порядок критичен: state присваивается ДО запуска эффектов. SET_LOCAL синхронно
  // запускает settings-subscribe → re-entrant dispatch(SETTINGS_EMITTED), который
  // обязан увидеть уже взведённый `skipNextEcho` (иначе эхо-push прорвётся).
  function dispatch(event: SyncEvent) {
    const result = coordinateSync({ state, event });
    state = result.state;
    runEffects(result.effects);
  }

  const unsubscribePush = settings.subscribe((value) => {
    dispatch({ type: 'SETTINGS_EMITTED', value });
  });

  function notifyAuthChanged() {
    dispatch({ type: 'AUTH_CHANGED', status: authStore.state.status });
  }

  function dispose() {
    unsubscribePush();
  }

  return { notifyAuthChanged, dispose };
}
