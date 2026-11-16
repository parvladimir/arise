import type { NextRequest } from "next/server";
import { createSession, register, tooManyAttempts } from "@/server/auth";
import { clientIp, json, readJson, sameOrigin, setSessionCookie } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const body = await readJson(req);
  if (!body) return json({ error: "badRequest" }, 400);
  if (tooManyAttempts(`reg:${clientIp(req)}`)) return json({ error: "tooMany" }, 429);
  const user = register(body.email, body.password);
  if (typeof user === "string") return json({ error: user }, user === "taken" ? 409 : 400);
  const { token } = createSession(user.id);
  const res = json({ user });
  setSessionCookie(res, req, token);
  return res;
}
