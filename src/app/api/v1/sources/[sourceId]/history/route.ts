import { NextResponse } from "next/server";
import { jsonError, requireApiKey, requireSourceOwner } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import type { HistoryEventRow, SourceRow } from "@/lib/db/schema";

type Ctx = { params: Promise<{ sourceId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const { sourceId } = await ctx.params;
  const wrongOwner = requireSourceOwner(req, sourceId);
  if (wrongOwner) return wrongOwner;
  const db = getDb();
  const source = db.prepare(`SELECT id FROM sources WHERE id = ?`).get(sourceId) as
    | Pick<SourceRow, "id">
    | undefined;
  if (!source) return jsonError("Source not found", 404);

  const rows = db
    .prepare(
      `SELECT id, source_id, type, message, payload_json, created_at
       FROM history_events WHERE source_id = ? ORDER BY created_at ASC`,
    )
    .all(sourceId) as HistoryEventRow[];

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      sourceId: r.source_id,
      type: r.type,
      message: r.message,
      payload: JSON.parse(r.payload_json || "{}"),
      createdAt: r.created_at,
    })),
  );
}
