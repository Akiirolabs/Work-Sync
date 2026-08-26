import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireApiKey } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { appendEvent, nowIso } from "@/lib/db/helpers";
import type { SourceRow } from "@/lib/db/schema";

const CreateSourceSchema = z.object({
  name: z.string().min(1).max(200),
  topicTag: z.string().min(1).max(120),
  notes: z.string().max(4000).optional(),
});

export async function GET(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, topic_tag, notes, status, created_at, updated_at
       FROM sources ORDER BY updated_at DESC`,
    )
    .all() as SourceRow[];

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      topicTag: r.topic_tag,
      notes: r.notes,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  );
}

export async function POST(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = CreateSourceSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const id = crypto.randomUUID();
  const ts = nowIso();
  const db = getDb();
  db.prepare(
    `INSERT INTO sources (id, name, topic_tag, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'draft', ?, ?)`,
  ).run(id, parsed.data.name, parsed.data.topicTag, parsed.data.notes ?? "", ts, ts);

  appendEvent(id, "source_created", `Source created: ${parsed.data.name}`, {
    topicTag: parsed.data.topicTag,
  });

  return NextResponse.json(
    {
      id,
      name: parsed.data.name,
      topicTag: parsed.data.topicTag,
      notes: parsed.data.notes ?? "",
      status: "draft",
      createdAt: ts,
      updatedAt: ts,
    },
    { status: 201 },
  );
}
