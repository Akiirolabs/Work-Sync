import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireApiKey } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { appendEvent, nowIso } from "@/lib/db/helpers";
import type { FixDocumentRow, SourceRow, VerificationRow } from "@/lib/db/schema";
import { documentFix } from "@/lib/document";
import type { Finding, VerifyResult } from "@/lib/verify";

type Ctx = { params: Promise<{ sourceId: string }> };

const BodySchema = z.object({
  findingId: z.string().min(1),
  fixId: z.string().min(1),
  status: z.enum(["applied", "dismissed"]).default("applied"),
});

export async function GET(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const { sourceId } = await ctx.params;
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, source_id, finding_id, fix_id, title, body_markdown, status, created_at, updated_at
       FROM fix_documents WHERE source_id = ? ORDER BY updated_at DESC`,
    )
    .all(sourceId) as FixDocumentRow[];

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      sourceId: r.source_id,
      findingId: r.finding_id,
      fixId: r.fix_id,
      title: r.title,
      bodyMarkdown: r.body_markdown,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  );
}

export async function POST(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const { sourceId } = await ctx.params;
  const db = getDb();
  const source = db.prepare(`SELECT id FROM sources WHERE id = ?`).get(sourceId) as
    | Pick<SourceRow, "id">
    | undefined;
  if (!source) return jsonError("Source not found", 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);

  const diag = db
    .prepare(`SELECT source_id, result_json, analyzed_at FROM verifications WHERE source_id = ?`)
    .get(sourceId) as VerificationRow | undefined;
  if (!diag) return jsonError("Verify the source first", 400);

  const result = JSON.parse(diag.result_json) as VerifyResult;
  const finding = result.findings.find((f: Finding) => f.id === parsed.data.findingId);
  if (!finding) return jsonError("Finding not found", 404);

  const fix = finding.recommendedFixes.find((f) => f.id === parsed.data.fixId);
  if (!fix) return jsonError("Fix not found", 404);

  const doc = documentFix({
    sourceId,
    finding,
    fix,
    status: parsed.data.status === "dismissed" ? "dismissed" : "applied",
  });

  db.prepare(
    `INSERT INTO fix_documents
      (id, source_id, finding_id, fix_id, title, body_markdown, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    doc.id,
    doc.sourceId,
    doc.findingId,
    doc.fixId,
    doc.title,
    doc.bodyMarkdown,
    doc.status,
    doc.createdAt,
    nowIso(),
  );

  appendEvent(
    sourceId,
    parsed.data.status === "dismissed" ? "fix_dismissed" : "fix_applied",
    `${parsed.data.status === "dismissed" ? "Dismissed" : "Applied"} fix: ${fix.title}`,
    { findingId: finding.id, fixId: fix.id, documentId: doc.id },
  );

  return NextResponse.json(doc, { status: 201 });
}
