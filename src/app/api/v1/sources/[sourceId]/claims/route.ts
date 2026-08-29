import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireApiKey, requireSourceOwner } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { appendEvent, touchSource } from "@/lib/db/helpers";
import type { ClaimsRow, SourceRow } from "@/lib/db/schema";
import { assertWithinByteLimit, parseClaimsText } from "@/lib/ingest";

type Ctx = { params: Promise<{ sourceId: string }> };

const BodySchema = z.object({
  text: z.string().optional(),
  json: z.unknown().optional(),
});

export async function GET(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const { sourceId } = await ctx.params;
  const wrongOwner = requireSourceOwner(req, sourceId);
  if (wrongOwner) return wrongOwner;
  const db = getDb();
  const row = db
    .prepare(`SELECT source_id, series_json, source, ingested_at FROM claims WHERE source_id = ?`)
    .get(sourceId) as ClaimsRow | undefined;
  if (!row) return jsonError("No claims for source", 404);

  return NextResponse.json({
    sourceId: row.source_id,
    series: JSON.parse(row.series_json),
    source: row.source,
    ingestedAt: row.ingested_at,
  });
}

export async function POST(req: Request, ctx: Ctx) {
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

  const maxBytes = Number(process.env.KNOWLEDGE_MAX_UPLOAD_BYTES ?? 5_242_880);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);
  if (!parsed.data.text && parsed.data.json === undefined) {
    return jsonError("Provide text or json claims", 400);
  }

  try {
    let series;
    if (parsed.data.text !== undefined) {
      assertWithinByteLimit(Buffer.byteLength(parsed.data.text, "utf8"), maxBytes);
      series = parseClaimsText(parsed.data.text);
    } else {
      const raw = JSON.stringify(parsed.data.json);
      assertWithinByteLimit(Buffer.byteLength(raw, "utf8"), maxBytes);
      series = parseClaimsText(
        Array.isArray(parsed.data.json)
          ? (parsed.data.json as unknown[]).map((row) => JSON.stringify(row)).join("\n")
          : raw,
      );
    }

    const ingestedAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO claims (source_id, series_json, source, ingested_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(source_id) DO UPDATE SET
         series_json = excluded.series_json,
         source = excluded.source,
         ingested_at = excluded.ingested_at`,
    ).run(sourceId, JSON.stringify(series), "upload", ingestedAt);

    touchSource(sourceId, "ready");
    const event = appendEvent(
      sourceId,
      "claims_ingested",
      `Ingested ${series.length} claim(s)`,
      { source: "upload", seriesCount: series.length },
    );

    return NextResponse.json({ series, event });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Ingest failed", 400);
  }
}
