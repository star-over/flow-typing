'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings.store';

export const LANG_COOKIE_NAME = 'NEXT_LOCALE'; // Common name for Next.js locale cookies

export function LanguageSetter() {
  const language = useSettingsStore((state) => state.language);

  useEffect(() => {
    // Set cookie with current language from Zustand store
    document.cookie = `${LANG_COOKIE_NAME}=${language}; path=/; max-age=31536000; SameSite=Lax`;
  }, [language]);

  return null;
}
