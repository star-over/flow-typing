import { Suspense } from 'react';
import { AppClient } from '@/app/app-client';
import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/interfaces/types';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>
        <AppClient dictionary={dictionary} />
      </Suspense>
    </main>
  );
}
