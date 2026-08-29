import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requestUserId } from "@/lib/security/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = requestUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign in to start a voice conversation." }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured on this server." }, { status: 503 });
  const offer = await req.text();
  if (!offer.startsWith("v=")) return NextResponse.json({ error: "Invalid WebRTC offer." }, { status: 400 });

  const session = {
    type: "realtime",
    model: "gpt-realtime-2.1-mini",
    output_modalities: ["audio"],
    instructions: "You are the Work Sync voice agent. Converse naturally and concisely. You cannot use tools or perform external actions; never claim that you did.",
    audio: {
      input: { transcription: { model: "gpt-4o-mini-transcribe" }, turn_detection: { type: "semantic_vad", eagerness: "auto", create_response: true, interrupt_response: true } },
      output: { voice: "marin" },
    },
    tools: [],
  };
  const form = new FormData();
  form.set("sdp", new Blob([offer], { type: "application/sdp" }), "offer.sdp");
  form.set("session", new Blob([JSON.stringify(session)], { type: "application/json" }), "session.json");
  const response = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  const answer = await response.text();
  if (!response.ok) return NextResponse.json({ error: "The Realtime session could not be created.", detail: answer.slice(0, 500) }, { status: response.status });

  const id = crypto.randomUUID(); const now = new Date().toISOString();
  getDb().prepare("INSERT INTO voice_conversations (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, userId, now, now);
  return NextResponse.json({ sdp: answer, conversationId: id });
}
