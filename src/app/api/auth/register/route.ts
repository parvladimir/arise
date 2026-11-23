import type { NextRequest } from "next/server";
import { addEmail, createSession, linkTelegram, register, tooManyAttempts } from "@/server/auth";
import { clientIp, currentUser, json, readJson, sameOrigin, setSessionCookie } from "@/server/http";
import { accessPlayer, NO_AUTO_COOKIE } from "@/server/tgauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const body = await readJson(req);
  if (!body) return json({ error: "badRequest" }, 400);
  if (tooManyAttempts(`reg:${clientIp(req)}`)) return json({ error: "tooMany" }, 429);
  // Игрок из Telegram добавляет почту к своему же аккаунту, а не заводит новый.
  const cur = currentUser(req);
  const user = cur && cur.email === "" ? addEmail(cur.id, body.email, body.password) : register(body.email, body.password);
  if (typeof user === "string") return json({ error: user }, user === "taken" ? 409 : 400);
  const { token } = createSession(user.id);
  const player = accessPlayer(req);
  if (player) linkTelegram(user.id, player.tg_id, player.name);
  const res = json({ user });
  setSessionCookie(res, req, token);
  res.cookies.set(NO_AUTO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
