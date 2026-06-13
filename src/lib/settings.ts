import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
  INTERFACE_LANGUAGES,
  SYMBOL_LAYOUT_IDS,
  TEXT_LANGUAGES,
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
import { decideSyncOnLogin, settingsToCloudArgs, type CloudSettings } from './settings-sync';

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

  const theme: ThemeSetting = isThemeSetting(stored.theme)
    ? stored.theme
    : DEFAULT_USER_SETTINGS.theme;

  // Свободная строка — любое имя валидно; не-строка → дефолт (пустая строка).
  const displayName = typeof stored.displayName === 'string'
    ? stored.displayName
    : DEFAULT_USER_SETTINGS.displayName;

  return { interfaceLanguage, textLanguage, symbolLayoutId, theme, displayName };
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
 * Гарантии:
 * - Ни pull, ни push не делается, пока authStore не в 'authenticated'. Гость живёт
 *   исключительно в localStorage (текущее Phase 4 поведение).
 * - **Single-session sync.** Pull/push при login-sync делается один раз за
 *   authentication session (флаг `hasSyncedThisSession`). Token-refresh flicker
 *   (`authenticated → loading → authenticated` без logout) НЕ вызывает повторный
 *   pull, что защищает pending local edit от перетирания.
 * - **In-order push.** Все push'и идут через `pushChain` Promise — Convex видит
 *   их в порядке user-actions даже если network reorder'ит requests.
 * - **Retry on failure.** Pull/push throw в login-sync сбрасывает `hasSyncedThisSession`
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
  let hasSyncedThisSession = false;
  let skipNextSubscribeCallback = false;
  let isInitialSubscribe = true;
  // Serialized push chain — гарантия порядка отправки даже при network reorder.
  let pushChain: Promise<unknown> = Promise.resolve();

  function enqueuePush(args: ReturnType<typeof settingsToCloudArgs>) {
    pushChain = pushChain.catch(() => {}).then(() => pushCloud(args));
    pushChain.catch(() => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[settings-sync] push failed (will retry on next change)');
      }
    });
  }

  const unsubscribePush = settings.subscribe((value) => {
    if (isInitialSubscribe) {
      isInitialSubscribe = false;
      return;
    }
    if (skipNextSubscribeCallback) {
      skipNextSubscribeCallback = false;
      return;
    }
    if (authStore.state.status !== 'authenticated') return;
    enqueuePush(settingsToCloudArgs(value));
  });

  function currentSettingsSnapshot(): UserSettings {
    let snapshot!: UserSettings;
    settings.subscribe(v => { snapshot = v; })();
    return snapshot;
  }

  function notifyAuthChanged() {
    const status = authStore.state.status;
    // Logout / loading — сбрасываем session-flag, никаких syncs. Re-login потом
    // снова даст one-shot sync.
    if (status === 'guest') {
      hasSyncedThisSession = false;
      // Defense-in-depth: cancel pushChain. Если pending push не успел отправиться
      // до logout, он будет отправлен под expired token (Convex 401 → catch eats).
      // Безопасно, но шумно в console; cancel явно избегает.
      pushChain = Promise.resolve();
      return;
    }
    if (status === 'loading') return;
    // status === 'authenticated' — но если в этой session уже синхронизировались, skip.
    // Защита от token-refresh flicker'а и от effect re-runs из-за других reactive deps.
    if (hasSyncedThisSession) return;
    hasSyncedThisSession = true;
    void (async () => {
      try {
        const cloudRow = await pullCloud();
        const localSnapshot = currentSettingsSnapshot();
        const decision = decideSyncOnLogin({
          cloudRow,
          localSettings: localSnapshot,
        });
        if (decision.action === 'pull') {
          skipNextSubscribeCallback = true;
          settings.set(decision.settings);
        } else {
          // First-sync push: ставим в chain (а не await отдельно) для unified ordering.
          enqueuePush(settingsToCloudArgs(decision.settings));
        }
      } catch (e) {
        // Сброс флага → следующий state-tick (или mount после reload) повторит pull.
        hasSyncedThisSession = false;
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[settings-sync] login-sync failed (will retry)', e);
        }
      }
    })();
  }

  function dispose() {
    unsubscribePush();
  }

  return { notifyAuthChanged, dispose };
}
