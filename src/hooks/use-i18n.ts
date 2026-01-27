import { useState, useEffect } from 'react';
import { useUserPreferencesStore } from '@/store/user-preferences.store';
import { Dictionary, Locale } from '@/interfaces/types';

/**
 * A custom hook to manage the application's internationalization (i18n) state.
 * It initializes with a server-provided dictionary and locale, and then keeps
 * them in sync with the user's preferences stored in Zustand.
 *
 * @param initialDictionary The dictionary provided during server-side rendering.
 * @param initialLocale The locale provided during server-side rendering.
 * @returns An object containing the `currentDictionary` to be used for UI text.
 */
export function useI18n(initialDictionary: Dictionary, initialLocale: Locale) {
  const [currentDictionary, setCurrentDictionary] = useState<Dictionary>(initialDictionary);
  const [currentLocale, setCurrentLocale] = useState<Locale>(initialLocale);

  const {
    language: zustandLanguage,
    isInitialized: isUserPreferencesStoreInitialized,
  } = useUserPreferencesStore();

  // Effect to load and sync the dictionary when the language preference changes.
  useEffect(() => {
    // Ensure the store is hydrated and the language preference is different from the current.
    if (isUserPreferencesStoreInitialized && zustandLanguage && zustandLanguage !== currentLocale) {
      const loadDictionary = async () => {
        try {
          const newDictionary = await import(`../../dictionaries/${zustandLanguage}.json`).then(
            (module) => module.default
          );
          setCurrentDictionary(newDictionary);
          setCurrentLocale(zustandLanguage);
        } catch (error) {
          console.error(`Failed to load dictionary for locale: ${zustandLanguage}`, error);
          // In case of an error, we can either do nothing (keeping the old dictionary)
          // or fall back to a default, like 'en'. For now, we do nothing.
        }
      };
      loadDictionary();
    }
  }, [zustandLanguage, currentLocale, isUserPreferencesStoreInitialized]);

  return { currentDictionary };
}
