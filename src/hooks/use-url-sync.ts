import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUserPreferencesStore } from '@/store/user-preferences.store';

/**
 * A custom hook to synchronize the `exerciseId` state between the Zustand store
 * and the URL search parameters.
 * - On load, it reads `exerciseId` from the URL and updates the store.
 * - When the store's `exerciseId` changes, it updates the URL.
 */
export function useUrlSync() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isInitialized: isUserPreferencesStoreInitialized,
    shared,
    updateUserPreferences,
  } = useUserPreferencesStore();
  const { exerciseId: exerciseIdFromStore } = shared;

  // Effect to read URL parameters on initial load and update the store
  useEffect(() => {
    if (isUserPreferencesStoreInitialized) {
      const exerciseIdFromUrl = searchParams.get('exerciseId');
      if (exerciseIdFromUrl && exerciseIdFromUrl !== exerciseIdFromStore) {
        updateUserPreferences({ shared: { exerciseId: exerciseIdFromUrl } });
      }
    }
  }, [isUserPreferencesStoreInitialized, searchParams, updateUserPreferences, exerciseIdFromStore]);

  // Effect to update URL parameters when the store changes
  useEffect(() => {
    if (isUserPreferencesStoreInitialized) {
      const currentUrlParams = new URLSearchParams(window.location.search);
      if (exerciseIdFromStore) {
        currentUrlParams.set('exerciseId', exerciseIdFromStore);
      } else {
        currentUrlParams.delete('exerciseId');
      }
      const newQueryString = currentUrlParams.toString();
      // Prevents unnecessary router pushes if the query string is already correct
      const currentQueryString = window.location.search.replace(/^\?/, '');

      if (newQueryString !== currentQueryString) {
        // Using router.push to create a new history entry might be better for this
        router.replace(`/${newQueryString ? `?${newQueryString}` : ''}`, { scroll: false });
      }
    }
  }, [isUserPreferencesStoreInitialized, exerciseIdFromStore, router]);
}
