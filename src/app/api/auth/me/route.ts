import type { NextRequest } from "next/server";
import { json } from "@/server/http";
import { resolveUser } from "@/server/tgauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const res = json({});
  const user = resolveUser(req, res);
  const out = json({ user });
  for (const c of res.cookies.getAll()) out.cookies.set(c);
  return out;
}
