// Этот layout устанавливает атрибут lang для <html> и корректно работает с params как с промисом
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // params теперь ожидается как промис
}) {
  // Примечание: в этой версии Next.js/Turbopack `params` является промисом.
  // Необходимо использовать `await`, чтобы получить доступ к его значениям.
  const awaitedParams = await params;
  const locale = awaitedParams.locale;

  return (
    <html lang={locale}>
      <body>
        {children}
      </body>
    </html>
  );
}
