import type { NextRequest } from "next/server";
import { loadSave, MAX_SAVE_BYTES, storeSave } from "@/server/auth";
import { currentUser, json, sameOrigin } from "@/server/http";

// Прогресс игрока в базе: GET — получить, PUT — записать (тело — сохранение игры как текст JSON).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = currentUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);
  return json({ save: loadSave(user.id) });
}

export async function PUT(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const user = currentUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);
  const text = await req.text();
  if (text.length > MAX_SAVE_BYTES) return json({ error: "tooLarge" }, 413);
  if (!storeSave(user.id, text)) return json({ error: "badSave" }, 400);
  return json({ ok: true });
}
