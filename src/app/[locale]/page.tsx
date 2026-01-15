import { getDictionary } from '@/lib/dictionaries';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>; // params теперь ожидается как промис
}) {
  // Примечание: в этой версии Next.js/Turbopack `params` является промисом.
  // Необходимо использовать `await`, чтобы получить доступ к его значениям.
  const awaitedParams = await params;
  const locale = awaitedParams.locale;

  // Теперь getDictionary получит корректный locale
  const dict = await getDictionary(locale);

  return (
    <main>
      <h1>{dict.title}</h1>
    </main>
  );
}
