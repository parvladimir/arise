import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, ACCESS_DAYS, markOpened, playerByKey } from "@/server/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Личная ссылка из Telegram-бота: проверяем ключ, запоминаем браузер и открываем игру.
export async function GET(req: NextRequest) {
  const base = new URL("/", `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host") ?? req.headers.get("host")}`);
  const player = playerByKey(req.nextUrl.searchParams.get("k") ?? undefined);
  if (!player) {
    base.searchParams.set("access", "bad");
    return NextResponse.redirect(base, 303);
  }
  markOpened(player.tg_id);
  const res = NextResponse.redirect(base, 303);
  res.cookies.set(ACCESS_COOKIE, player.access_key, {
    httpOnly: true,
    sameSite: "lax",
    secure: base.protocol === "https:",
    path: "/",
    maxAge: ACCESS_DAYS * 86400,
  });
  return res;
}
