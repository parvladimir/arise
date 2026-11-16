import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI RISE · ТАКТ ИИ",
  description: "Игра от ТАКТ ИИ: учись писать промпты и понимать нейросети на живых задачах.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0a16",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
