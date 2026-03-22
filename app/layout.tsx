import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hotel Management System",
  description: "Hệ thống quản lý khách sạn nội bộ",
  icons: {
    icon: "/favicon-empty.svg",
    shortcut: "/favicon-empty.svg",
    apple: "/favicon-empty.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetBrainsMono.variable} min-h-screen bg-slate-100 font-sans text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
