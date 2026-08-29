import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requestUserId } from "@/lib/security/auth";

const TurnSchema = z.object({ text: z.string().trim().min(1).max(20_000) });

export async function POST(req: Request, context: { params: Promise<{ conversationId: string }> }) {
  const userId = requestUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null); const parsed = TurnSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid transcript" }, { status: 400 });
  const { conversationId } = await context.params; const db = getDb();
  const owned = db.prepare("SELECT id FROM voice_conversations WHERE id = ? AND user_id = ?").get(conversationId, userId);
  if (!owned) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  db.prepare("INSERT INTO voice_messages (id, conversation_id, user_id, role, body, created_at) VALUES (?, ?, ?, 'user', ?, ?)").run(id, conversationId, userId, parsed.data.text, now);
  db.prepare("UPDATE voice_conversations SET updated_at = ? WHERE id = ?").run(now, conversationId);
  return NextResponse.json({ id, role: "user", text: parsed.data.text, createdAt: now }, { status: 201 });
}
