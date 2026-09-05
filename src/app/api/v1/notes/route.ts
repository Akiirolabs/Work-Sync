import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireApiKey } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { nowIso } from "@/lib/db/helpers";
import type { WorkspaceNoteRow } from "@/lib/db/schema";
import { requestUserId } from "@/lib/security/auth";

const CreateNoteSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(100_000),
});

function titleFromBody(body: string, fallback?: string) {
  const line = body.split("\n").find((l) => l.trim());
  if (line) return line.trim().replace(/^#{1,4}\s+/, "").slice(0, 80);
  if (fallback?.trim()) return fallback.trim().slice(0, 80);
  return "Untitled";
}

function toJson(row: WorkspaceNoteRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const userId = requestUserId(req);

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, user_id, title, title_locked, body, created_at, updated_at
       FROM workspace_notes WHERE user_id IS ? ORDER BY updated_at DESC`,
    )
    .all(userId) as WorkspaceNoteRow[];

  return NextResponse.json(rows.map(toJson));
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

  const parsed = CreateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const id = crypto.randomUUID();
  const ts = nowIso();
  const title = titleFromBody(parsed.data.body, parsed.data.title);
  const db = getDb();
  db.prepare(
    `INSERT INTO workspace_notes (id, user_id, title, title_locked, body, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, ?)`,
  ).run(id, userId, title, parsed.data.body, ts, ts);

  return NextResponse.json(
    { id, title, body: parsed.data.body, createdAt: ts, updatedAt: ts },
    { status: 201 },
  );
}
