import type { MetadataRoute } from "next";

// Установка игры на рабочий стол телефона (Android: «Установить приложение», iOS: «На экран „Домой“»).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI RISE · ТАКТ ИИ",
    short_name: "AI RISE",
    description: "Игра от ТАКТ ИИ: учись писать промпты и понимать нейросети на живых задачах.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0a16",
    theme_color: "#0b0a16",
    lang: "ru",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
