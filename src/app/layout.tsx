import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jemico's Book Quotes Library",
  description:
    "A premium digital quote sanctuary for books, notes, and beautiful saved passages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
