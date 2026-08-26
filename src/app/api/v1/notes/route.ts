import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireApiKey } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { nowIso } from "@/lib/db/helpers";
import type { WorkspaceNoteRow } from "@/lib/db/schema";

const CreateNoteSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(100_000),
});

function titleFromBody(body: string, fallback?: string) {
  const line = body.split("\n").find((l) => l.trim());
  if (line) return line.trim().slice(0, 80);
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

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, title, body, created_at, updated_at
       FROM workspace_notes ORDER BY updated_at DESC`,
    )
    .all() as WorkspaceNoteRow[];

  return NextResponse.json(rows.map(toJson));
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

  const parsed = CreateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const id = crypto.randomUUID();
  const ts = nowIso();
  const title = titleFromBody(parsed.data.body, parsed.data.title);
  const db = getDb();
  db.prepare(
    `INSERT INTO workspace_notes (id, title, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, title, parsed.data.body, ts, ts);

  return NextResponse.json(
    { id, title, body: parsed.data.body, createdAt: ts, updatedAt: ts },
    { status: 201 },
  );
}
