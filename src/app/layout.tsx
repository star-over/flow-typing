import "./globals.css";

import type { Metadata } from "next";

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
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}