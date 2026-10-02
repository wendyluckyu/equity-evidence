import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "见微 · 个股证据诊断",
  description: "理解美的集团，沿事实、推断与未知证据继续研究。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
