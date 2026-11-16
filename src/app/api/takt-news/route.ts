import { NextResponse } from "next/server";
import { parseTgChannel } from "@/core/tgNews";

// Свежие посты канала «ТАКТ все про ИИ» для ленты новостей в игре.
// Сервер читает публичную страницу канала (ключи не нужны) и кеширует её на 15 минут.
// Если Telegram недоступен, отдаётся пустой список, и игра показывает свои новости.
const CHANNEL = "takt_news_ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`https://t.me/s/${CHANNEL}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ai-rise-game)", "Accept-Language": "ru" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = parseTgChannel(await res.text(), CHANNEL).slice(0, 8);
    return NextResponse.json({ posts }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return NextResponse.json({ posts: [] }, { headers: { "Cache-Control": "public, max-age=60" } });
  }
}
