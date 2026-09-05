import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requestUserId } from "@/lib/security/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = requestUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const db = getDb();
  const state = db.prepare("SELECT updated_at FROM user_state WHERE user_id = ?").get(userId) as { updated_at?: string } | undefined;
  const note = db.prepare("SELECT MAX(updated_at) AS updated_at FROM workspace_notes WHERE user_id IS ?").get(userId) as { updated_at?: string | null };
  const source = db.prepare("SELECT MAX(updated_at) AS updated_at FROM sources WHERE user_id IS ?").get(userId) as { updated_at?: string | null };
  return NextResponse.json({ revision: [state?.updated_at, note.updated_at, source.updated_at].filter(Boolean).sort().at(-1) ?? null });
}
