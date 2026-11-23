import type { NextRequest } from "next/server";
import { createSession, linkTelegram, login, normalizeEmail, tooManyAttempts } from "@/server/auth";
import { clientIp, json, readJson, sameOrigin, setSessionCookie } from "@/server/http";
import { accessPlayer, NO_AUTO_COOKIE } from "@/server/tgauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const body = await readJson(req);
  if (!body) return json({ error: "badRequest" }, 400);
  if (tooManyAttempts(`ip:${clientIp(req)}`) || tooManyAttempts(`mail:${normalizeEmail(body.email) ?? "?"}`)) return json({ error: "tooMany" }, 429);
  const user = login(body.email, body.password);
  if (typeof user === "string") return json({ error: user }, 401);
  const { token } = createSession(user.id);
  const player = accessPlayer(req);
  if (player) linkTelegram(user.id, player.tg_id, player.name);
  const res = json({ user });
  setSessionCookie(res, req, token);
  res.cookies.set(NO_AUTO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
