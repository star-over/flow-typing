'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const locales = ['en', 'ru'];
const defaultLocale = 'en';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const userLanguages = navigator.languages || [navigator.language];
    const preferredLanguage = userLanguages.find((lang) => {
      const baseLang = lang.split('-')[0];
      return locales.includes(baseLang);
    })?.split('-')[0] || defaultLocale;

    router.replace(`/${preferredLanguage}`);
  }, [router]);

  // TODO: move string const to i18n
  return <div>Loading...</div>;
}
