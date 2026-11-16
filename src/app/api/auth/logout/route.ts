import type { NextRequest } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/server/auth";
import { clearSessionCookie, json, sameOrigin } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  deleteSession(req.cookies.get(SESSION_COOKIE)?.value);
  const res = json({ ok: true });
  clearSessionCookie(res, req);
  return res;
}
