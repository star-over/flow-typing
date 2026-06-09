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

// localStorage-ключ намеренно сохранён со старым именем `flow-typing-user-preferences`
// — это публичный контракт с уже существующими пользователями, переименовывать его
// нельзя без миграции.
const STORAGE_KEY = 'flow-typing-user-preferences';
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

  const shared =
    typeof stored.shared === 'object' && stored.shared !== null
      ? (stored.shared as UserSettings['shared'])
      : {};

  const theme: ThemeSetting = isThemeSetting(stored.theme)
    ? stored.theme
    : DEFAULT_USER_SETTINGS.theme;

  return { interfaceLanguage, textLanguage, symbolLayoutId, theme, shared };
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
