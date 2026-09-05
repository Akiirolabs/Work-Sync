import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireApiKey } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { nowIso } from "@/lib/db/helpers";
import type { WorkspaceNoteRow } from "@/lib/db/schema";
import { requestUserId } from "@/lib/security/auth";

const UpdateNoteSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(100_000),
});

function titleFromBody(body: string, fallback?: string) {
  const line = body.split("\n").find((l) => l.trim());
  if (line) return line.trim().replace(/^#{1,4}\s+/, "").slice(0, 80);
  if (fallback?.trim()) return fallback.trim().slice(0, 80);
  return "Untitled";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const userId = requestUserId(req);

  const { noteId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = UpdateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id, user_id, title, title_locked, body, created_at, updated_at FROM workspace_notes WHERE id = ? AND user_id IS ?`,
    )
    .get(noteId, userId) as WorkspaceNoteRow | undefined;
  if (!existing) return jsonError("Not found", 404);

  const ts = nowIso();
  const explicitTitle = parsed.data.title?.trim();
  const titleLocked = explicitTitle ? 1 : existing.title_locked;
  const title = explicitTitle ? explicitTitle.slice(0, 200) : titleLocked ? existing.title : titleFromBody(parsed.data.body, existing.title);
  db.prepare(
    `UPDATE workspace_notes SET title = ?, title_locked = ?, body = ?, updated_at = ? WHERE id = ? AND user_id IS ?`,
  ).run(title, titleLocked, parsed.data.body, ts, noteId, userId);

  return NextResponse.json({
    id: noteId,
    title,
    body: parsed.data.body,
    createdAt: existing.created_at,
    updatedAt: ts,
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const userId = requestUserId(req);

  const { noteId } = await params;
  const db = getDb();
  const result = db.prepare(`DELETE FROM workspace_notes WHERE id = ? AND user_id IS ?`).run(noteId, userId);
  if (!result.changes) return jsonError("Not found", 404);
  return NextResponse.json({ ok: true });
}
