import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { nowIso } from "@/lib/db/helpers";
import { requestUserId } from "@/lib/security/auth";
import type { UserStateRow } from "@/lib/db/schema";

export const runtime = "nodejs";

const MAX_STATE_BYTES = 4 * 1024 * 1024;
const StateSchema = z.object({
  entries: z.record(z.string().min(1).max(300), z.string().max(2_000_000)),
});

function signedInUser(req: Request) {
  const userId = requestUserId(req);
  return userId ? { userId } : null;
}

export async function GET(req: Request) {
  const auth = signedInUser(req);
  if (!auth) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const row = getDb()
    .prepare("SELECT user_id, state_json, updated_at FROM user_state WHERE user_id = ?")
    .get(auth.userId) as UserStateRow | undefined;

  if (!row) return NextResponse.json({ entries: {}, updatedAt: null });
  try {
    return NextResponse.json({ entries: JSON.parse(row.state_json) as Record<string, string>, updatedAt: row.updated_at });
  } catch {
    return NextResponse.json({ entries: {}, updatedAt: row.updated_at });
  }
}

export async function PUT(req: Request) {
  const auth = signedInUser(req);
  if (!auth) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_STATE_BYTES) {
    return NextResponse.json({ error: "Synced account data is too large." }, { status: 413 });
  }

  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = StateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data?.entries ?? {}).length > 2_000) {
    return NextResponse.json({ error: parsed.success ? "Too many synced entries." : parsed.error.issues[0]?.message ?? "Invalid state." }, { status: 400 });
  }

  const timestamp = nowIso();
  getDb().prepare(
    `INSERT INTO user_state (user_id, state_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`,
  ).run(auth.userId, JSON.stringify(parsed.data.entries), timestamp);

  return NextResponse.json({ ok: true, updatedAt: timestamp });
}
