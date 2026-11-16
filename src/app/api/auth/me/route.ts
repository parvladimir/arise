import type { NextRequest } from "next/server";
import { currentUser, json } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return json({ user: currentUser(req) });
}
