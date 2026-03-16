import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Shopping List",
  description: "AIで店ごとに整理できる買い物リストアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}