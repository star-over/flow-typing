// src/store/settings.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Settings } from '@/interfaces/settings';
import { DEFAULT_SETTINGS } from '@/data/default-settings';
import { deepMerge } from '@/lib/utils';

interface SettingsState extends Settings {
  updateSettings: (newSettings: Partial<Settings>) => void;
  isInitialized: boolean;
}

// We are using a partial state for the persisted object because we want the
// default settings to be applied for any settings that are not in localStorage.
type PersistedSettingsState = Partial<Settings>;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      isInitialized: false,
      updateSettings: (newSettings) => {
        set((state) => deepMerge(state, newSettings));
      },
    }),
    {
      name: 'flow-typing-settings',
      storage: createJSONStorage(() => localStorage),
      // On load, merge the persisted state with the current state (which includes defaults).
      // This ensures that new settings from code updates are included.
      merge: (persistedState, currentState) => {
        const merged = deepMerge(currentState, persistedState as PersistedSettingsState);
        return { ...merged, isInitialized: true };
      },
    }
  )
);
