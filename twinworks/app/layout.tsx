import type { Metadata } from "next";
import { NeoChrome } from "@/components/NeoChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "Личные финансы",
  description: "Управление личными финансами и целями",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <NeoChrome />
        {children}
      </body>
    </html>
  );
}
