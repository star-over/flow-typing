import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import {
  INTERFACE_LANGUAGES,
  SYMBOL_LAYOUT_IDS,
  TEXT_LANGUAGES,
  type InterfaceLanguage,
  type SymbolLayoutId,
  type TextLanguage,
} from '@/interfaces/types';
import type { UserPreferences } from '@/interfaces/user-preferences';
import { DEFAULT_USER_PREFERENCES } from '@/user-preferences/user-preferences';
import {
  getCompatibleSymbolLayoutsForTextLanguage,
  getDefaultSymbolLayoutForTextLanguage,
} from '@/lib/layouts';

const STORAGE_KEY = 'flow-typing-user-preferences';

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
 * Приводит произвольное содержимое localStorage к валидному UserPreferences,
 * заполняя пропуски по каскаду interfaceLanguage → textLanguage → symbolLayoutId.
 * Legacy ключи (например, старый `language`) игнорируются.
 */
export function normalizePreferences(raw: unknown): UserPreferences {
  const stored = (raw ?? {}) as Record<string, unknown>;

  const interfaceLanguage = isInterfaceLanguage(stored.interfaceLanguage)
    ? stored.interfaceLanguage
    : DEFAULT_USER_PREFERENCES.interfaceLanguage;

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
      ? (stored.shared as UserPreferences['shared'])
      : {};

  return { interfaceLanguage, textLanguage, symbolLayoutId, shared };
}

function safeJsonParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

function createPreferencesStore() {
  const load = (): UserPreferences => {
    if (!browser) return { ...DEFAULT_USER_PREFERENCES };
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? safeJsonParse(raw) : null;
    return normalizePreferences(parsed);
  };

  const store = writable<UserPreferences>(load());

  store.subscribe((value) => {
    if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  });

  return {
    subscribe: store.subscribe,
    update: (fn: (current: UserPreferences) => UserPreferences) =>
      store.update(current => normalizePreferences(fn(current))),
    set: (value: UserPreferences) => store.set(normalizePreferences(value)),
  };
}

export const preferences = createPreferencesStore();
export const symbolLayoutId = derived(preferences, ($p) => $p.symbolLayoutId);

export function updatePreferences(partial: Partial<UserPreferences>) {
  preferences.update((current) => ({ ...current, ...partial }));
}
