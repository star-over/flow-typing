import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from 'next/font/google';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The `lang` attribute will be set in the [locale]/layout.tsx
    // eslint-disable-next-line jsx-a11y/html-has-lang
    <html className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        {children}
      </body>
    </html>
  );
}
