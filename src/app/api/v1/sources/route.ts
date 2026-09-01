import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireApiKey } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { appendEvent, nowIso } from "@/lib/db/helpers";
import type { SourceRow } from "@/lib/db/schema";
import { requestUserId } from "@/lib/security/auth";

const CreateSourceSchema = z.object({
  name: z.string().min(1).max(200),
  topicTag: z.string().min(1).max(120).optional(),
  workspaceNoteId: z.string().min(1).optional(),
  notes: z.string().max(4000).optional(),
}).refine((value) => Boolean(value.topicTag || value.workspaceNoteId), { message: "Choose a Workspace Note or provide a topic." });

export async function GET(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const userId = requestUserId(req);

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, user_id, name, topic_tag, workspace_note_id, notes, status, created_at, updated_at
       FROM sources WHERE user_id IS ? ORDER BY updated_at DESC`,
    )
    .all(userId) as SourceRow[];

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      topicTag: r.topic_tag,
      workspaceNoteId: r.workspace_note_id,
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
  const userId = requestUserId(req);

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
  const note = parsed.data.workspaceNoteId ? db.prepare("SELECT id, title FROM workspace_notes WHERE id = ? AND user_id = ?").get(parsed.data.workspaceNoteId, userId) as { id: string; title: string } | undefined : undefined;
  if (parsed.data.workspaceNoteId && !note) return jsonError("Workspace note not found.", 404);
  const topicTag = note?.title ?? parsed.data.topicTag!;
  db.prepare(
    `INSERT INTO sources (id, user_id, name, topic_tag, workspace_note_id, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
  ).run(id, userId, parsed.data.name, topicTag, note?.id ?? null, parsed.data.notes ?? "", ts, ts);

  appendEvent(id, "source_created", `Source created: ${parsed.data.name}`, {
    topicTag,
    workspaceNoteId: note?.id ?? null,
  });

  return NextResponse.json(
    {
      id,
      name: parsed.data.name,
      topicTag,
      workspaceNoteId: note?.id ?? null,
      notes: parsed.data.notes ?? "",
      status: "draft",
      createdAt: ts,
      updatedAt: ts,
    },
    { status: 201 },
  );
}
