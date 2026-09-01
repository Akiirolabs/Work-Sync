import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import type { WorkspaceNoteRow } from "@/lib/db/schema";
import { requestUserId } from "@/lib/security/auth";

export const runtime = "nodejs";

const RequestSchema = z.object({ noteId: z.string().min(1), notes: z.string().trim().min(1).max(8_000) });
const SourceSchema = z.object({ title: z.string(), url: z.string().url(), publisher: z.string(), summary: z.string(), trustReason: z.string() });
const ResultSchema = z.object({ sources: z.array(SourceSchema).min(1).max(12) });
const resultJsonSchema = { type: "object", additionalProperties: false, required: ["sources"], properties: { sources: { type: "array", minItems: 1, maxItems: 12, items: { type: "object", additionalProperties: false, required: ["title", "url", "publisher", "summary", "trustReason"], properties: { title: { type: "string" }, url: { type: "string" }, publisher: { type: "string" }, summary: { type: "string" }, trustReason: { type: "string" } } } } } } as const;

function responseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const direct = (payload as { output_text?: unknown }).output_text; if (typeof direct === "string") return direct;
  return ((payload as { output?: Array<{ content?: Array<{ text?: string }> }> }).output ?? []).flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("");
}

export async function POST(req: Request) {
  const userId = requestUserId(req); if (!userId) return NextResponse.json({ error: "Sign in to find sources." }, { status: 401 });
  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid source request." }, { status: 400 });
  const note = getDb().prepare("SELECT id, user_id, title, body, created_at, updated_at FROM workspace_notes WHERE id = ? AND user_id = ?").get(parsed.data.noteId, userId) as WorkspaceNoteRow | undefined;
  if (!note) return NextResponse.json({ error: "Workspace note not found." }, { status: 404 });
  const apiKey = process.env.OPENAI_API_KEY; if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured on this server." }, { status: 503 });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model: "gpt-5-mini", reasoning: { effort: "low" }, tools: [{ type: "web_search_preview" }], max_output_tokens: 10_000, text: { format: { type: "json_schema", name: "trusted_sources", strict: true, schema: resultJsonSchema } }, instructions: "You are Work Sync Sources. Find the most trustworthy, directly relevant sources for the user's request. Prefer primary sources, standards bodies, official documentation, original research, and respected independent reporting. Use web search and return only verifiable URLs. Do not invent sources. Return a compact, diverse list sorted by trust and relevance.", input: `Workspace note: ${note.title}\n\n${note.body}\n\nUser's subject/request for sources:\n${parsed.data.notes}` }) });
  if (!response.ok) return NextResponse.json({ error: "Source research could not complete.", detail: (await response.text()).slice(0, 500) }, { status: response.status || 502 });
  let decoded: unknown; try { decoded = JSON.parse(responseText(await response.json())); } catch { return NextResponse.json({ error: "Source research returned an unreadable result." }, { status: 502 }); }
  const result = ResultSchema.safeParse(decoded); if (!result.success) return NextResponse.json({ error: "Source research returned an incomplete result." }, { status: 502 });
  return NextResponse.json({ note: { id: note.id, title: note.title }, sources: result.data.sources });
}
