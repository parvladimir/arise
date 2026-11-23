import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Game } from "@/ui/Game";
import { Gate } from "@/ui/Gate";
import { botUrl, bump, gateEnabled, hasAccess, playersCount } from "@/server/access";

export const dynamic = "force-dynamic";

// Вход в игру — по личной ссылке из Telegram-бота ТАКТ AI (подписка на канал). Без неё — промо-страница.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  if (typeof q.k === "string") redirect(`/api/access?k=${encodeURIComponent(q.k)}`);
  if (!gateEnabled()) return <Game />;
  const jar = await cookies();
  if (hasAccess((name) => jar.get(name)?.value)) return <Game />;
  const from = typeof q.from === "string" ? q.from.replace(/[^\w-]/g, "").slice(0, 32) : "";
  // Превью ссылок (Telegram, Instagram, поисковики) и служебные проверки в статистику не считаем.
  const ua = (await headers()).get("user-agent") ?? "";
  if (ua && !/bot|crawl|spider|preview|facebookexternalhit|meta-external|whatsapp|curl|wget|python|httpx|headless|playwright|node-fetch/i.test(ua)) bump("view", from || "direct");
  return (
    <Gate
      botUrl={botUrl(from || "site")}
      demoUrl={botUrl("demo")}
      players={playersCount()}
      igUrl={process.env.IG_URL || undefined}
      bad={q.access === "bad"}
    />
  );
}
