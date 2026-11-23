import type { NextRequest } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/server/auth";
import { clearSessionCookie, json, sameOrigin } from "@/server/http";
import { NO_AUTO_COOKIE } from "@/server/tgauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  deleteSession(req.cookies.get(SESSION_COOKIE)?.value);
  const res = json({ ok: true });
  clearSessionCookie(res, req);
  res.cookies.set(NO_AUTO_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 86400 });
  return res;
}
