import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, ACCESS_DAYS, markOpened, playerByKey } from "@/server/access";
import { DEMO_COOKIE, DEMO_BONUS } from "@/core/demo";
import { NO_AUTO_COOKIE, resolveUser } from "@/server/tgauth";

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
  // Ссылка из бота сразу открывает аккаунт игры: вход без почты и пароля.
  req.cookies.delete(NO_AUTO_COOKIE);
  res.cookies.set(NO_AUTO_COOKIE, "", { path: "/", maxAge: 0 });
  resolveUser(req, res, player);
  // Пришёл из демо на промо-странице: заработанные там ₵ ждут в новой игре.
  if (player.source === "demo" && !req.cookies.get(DEMO_COOKIE)) {
    res.cookies.set(DEMO_COOKIE, String(DEMO_BONUS), { sameSite: "lax", path: "/", maxAge: 30 * 86400 });
  }
  return res;
}
