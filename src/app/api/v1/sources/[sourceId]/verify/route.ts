import { NextResponse } from "next/server";
import { jsonError, requireApiKey, requireVerifyRateLimit } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { appendEvent, touchSource } from "@/lib/db/helpers";
import type { ClaimsRow, SourceRow, VerificationRow } from "@/lib/db/schema";
import type { ClaimRow } from "@/lib/ingest";
import { runVerify } from "@/lib/verify";

type Ctx = { params: Promise<{ sourceId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const limited = requireVerifyRateLimit(req);
  if (limited) return limited;

  const { sourceId } = await ctx.params;
  const db = getDb();
  const source = db.prepare(`SELECT id FROM sources WHERE id = ?`).get(sourceId) as
    | Pick<SourceRow, "id">
    | undefined;
  if (!source) return jsonError("Source not found", 404);

  const claimRow = db
    .prepare(`SELECT source_id, series_json, source, ingested_at FROM claims WHERE source_id = ?`)
    .get(sourceId) as ClaimsRow | undefined;
  if (!claimRow) return jsonError("Ingest claims before verifying", 400);

  const series = JSON.parse(claimRow.series_json) as ClaimRow[];
  const result = runVerify(sourceId, series);
  db.prepare(
    `INSERT INTO verifications (source_id, result_json, analyzed_at)
     VALUES (?, ?, ?)
     ON CONFLICT(source_id) DO UPDATE SET
       result_json = excluded.result_json,
       analyzed_at = excluded.analyzed_at`,
  ).run(sourceId, JSON.stringify(result), result.analyzedAt);

  touchSource(sourceId, "verified");
  appendEvent(
    sourceId,
    "verify_completed",
    `Verify complete — ${result.findingCount} finding(s)`,
    { findingCount: result.findingCount },
  );

  return NextResponse.json(result);
}

export async function GET(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const { sourceId } = await ctx.params;
  const db = getDb();
  const row = db
    .prepare(`SELECT source_id, result_json, analyzed_at FROM verifications WHERE source_id = ?`)
    .get(sourceId) as VerificationRow | undefined;
  if (!row) return jsonError("No verification yet", 404);
  return NextResponse.json(JSON.parse(row.result_json));
}
