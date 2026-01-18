// src/store/user-preferences.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserPreferences } from '@/interfaces/user-preferences';
import { DEFAULT_USER_PREFERENCES } from '@/data/default-settings';
import { deepMerge } from '@/lib/utils';

interface UserPreferencesState extends UserPreferences {
  updateUserPreferences: (newUserPreferences: Partial<UserPreferences>) => void;
  isInitialized: boolean;
}

// We are using a partial state for the persisted object because we want the
// default preferences to be applied for any preferences that are not in localStorage.
type PersistedUserPreferencesState = Partial<UserPreferences>;

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_USER_PREFERENCES,
      isInitialized: false,
      updateUserPreferences: (newUserPreferences) => {
        set((state) => deepMerge(state, newUserPreferences));
      },
    }),
    {
      name: 'flow-typing-user-preferences',
      storage: createJSONStorage(() => localStorage),
      // On load, merge the persisted state with the current state (which includes defaults).
      // This ensures that new preferences from code updates are included.
      merge: (persistedState, currentState) => {
        const merged = deepMerge(currentState, persistedState as PersistedUserPreferencesState);
        return { ...merged, isInitialized: true };
      },
    }
  )
);
