import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { UserPreferences } from '@/interfaces/user-preferences';
import { DEFAULT_USER_PREFERENCES } from '@/user-preferences/user-preferences';
import { deepMerge } from '@/lib/utils';

function createPreferencesStore() {
  const load = (): UserPreferences => {
    if (!browser) return DEFAULT_USER_PREFERENCES;
    try {
      const stored = localStorage.getItem('flow-typing-user-preferences');
      if (stored) return deepMerge({ target: DEFAULT_USER_PREFERENCES, source: JSON.parse(stored) }) as UserPreferences;
    } catch { /* ignore parse errors */ }
    return DEFAULT_USER_PREFERENCES;
  };

  const store = writable<UserPreferences>(load());

  store.subscribe((value) => {
    if (browser) {
      localStorage.setItem('flow-typing-user-preferences', JSON.stringify(value));
    }
  });

  return {
    subscribe: store.subscribe,
    update: store.update,
    set: store.set,
  };
}

export const preferences = createPreferencesStore();
export const symbolLayoutId = derived(preferences, ($p) => $p.symbolLayoutId);

/** Deep-merge partial update to preserve nested fields (e.g. shared.exerciseId) */
export function updatePreferences(partial: Partial<UserPreferences>) {
  preferences.update((current) => deepMerge({ target: current, source: partial }));
}
