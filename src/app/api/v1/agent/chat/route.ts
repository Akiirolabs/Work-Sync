import { NextResponse } from "next/server";
import { z } from "zod";
import { requestUserId } from "@/lib/security/auth";

export const runtime = "nodejs";

const ChatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(20_000) })).min(1).max(40),
});

export async function POST(req: Request) {
  if (!requestUserId(req)) return NextResponse.json({ error: "Sign in to chat with Agent." }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured on this server." }, { status: 503 });
  const parsed = ChatSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid conversation." }, { status: 400 });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      instructions: "You are the Work Sync side-chat assistant. Be helpful, concise, and transparent. You cannot execute tools or external actions and must not claim that you did.",
      input: parsed.data.messages,
      max_output_tokens: 1200,
      tools: [],
      stream: true,
    }),
  });
  if (!response.ok || !response.body) {
    const detail = await response.text();
    return NextResponse.json({ error: "Agent could not answer.", detail: detail.slice(0, 500) }, { status: response.status || 502 });
  }
  return new Response(response.body, { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform" } });
}
