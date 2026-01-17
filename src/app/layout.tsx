import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from "next/headers"; // Import cookies
import { getDictionary } from "@/lib/dictionaries"; // Import getDictionary
import { Locale } from "@/interfaces/types"; // Import Locale
import { AppClient } from "./app-client";
import { LANG_COOKIE_NAME } from "@/components/LanguageSetter"; // Import LANG_COOKIE_NAME

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowTyping",
  description: "AI powered typing training",
};

export default async function RootLayout(
) {
  const cookiesList = await cookies(); // Await the cookies() function
  const locale = (cookiesList.get(LANG_COOKIE_NAME)?.value as Locale) || 'en'; // Read locale from cookie

  const dictionary = await getDictionary(locale); // Fetch dictionary

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        <AppClient dictionary={dictionary} initialLocale={locale} /> {/* Pass initialLocale */}
      </body>
    </html>
  );
}
