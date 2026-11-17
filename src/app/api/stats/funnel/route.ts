import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { funnelStats } from "@/server/access";
import { json } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Воронка игры для станции ТАКТ: показы промо-страницы, приходы в бота, новые подписчики канала.
// Доступ только по ключу STATS_TOKEN (тот же ключ лежит у станции как GAME_STATS_TOKEN).
export async function GET(req: NextRequest) {
  const want = process.env.STATS_TOKEN ?? "";
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!want || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) return json({ error: "forbidden" }, 403);
  return json(funnelStats());
}
