import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import type { WorkspaceNoteRow } from "@/lib/db/schema";
import { requestUserId } from "@/lib/security/auth";

export const runtime = "nodejs";

const RequestSchema = z.object({
  noteId: z.string().min(1),
  context: z.string().trim().min(1).max(20_000),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(20_000) })).max(20).default([]),
});

const FindingSchema = z.object({
  summary: z.string(), method: z.array(z.string()),
  confirmed: z.array(z.object({ assertion: z.string(), status: z.enum(["confirmed", "partially-confirmed", "unconfirmed", "contradicted"]), explanation: z.string(), evidenceIds: z.array(z.string()) })),
  evidence: z.array(z.object({ id: z.string(), title: z.string(), url: z.string(), publisher: z.string(), relevance: z.string() })),
  uncertainty: z.array(z.string()), trustScore: z.number().min(0).max(100), trustRationale: z.string(), answer: z.string(),
});

function responseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const direct = (payload as { output_text?: unknown }).output_text; if (typeof direct === "string") return direct;
  const output = (payload as { output?: Array<{ content?: Array<{ text?: string }> }> }).output ?? [];
  return output.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("");
}

export async function POST(req: Request) {
  const userId = requestUserId(req); if (!userId) return NextResponse.json({ error: "Sign in to verify Workspace notes." }, { status: 401 });
  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid verification request." }, { status: 400 });
  const note = getDb().prepare(`SELECT id, user_id, title, body, created_at, updated_at FROM workspace_notes WHERE id = ? AND user_id = ?`).get(parsed.data.noteId, userId) as WorkspaceNoteRow | undefined;
  if (!note) return NextResponse.json({ error: "Workspace note not found." }, { status: 404 });
  const apiKey = process.env.OPENAI_API_KEY; if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured on this server." }, { status: 503 });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini", tools: [{ type: "web_search_preview" }], max_output_tokens: 3000,
      instructions: `You are Work Sync Verify, a rigorous fact-checking assistant. Check factual assertions against primary, authoritative, and independent corroborating sources. Track provenance. Separate confirmed, partially confirmed, unconfirmed, and contradicted assertions. State uncertainty and never convert absence of evidence into confirmation. Return JSON only with this shape: {"summary":string,"method":string[],"confirmed":[{"assertion":string,"status":"confirmed"|"partially-confirmed"|"unconfirmed"|"contradicted","explanation":string,"evidenceIds":string[]}],"evidence":[{"id":string,"title":string,"url":string,"publisher":string,"relevance":string}],"uncertainty":string[],"trustScore":number 0-100,"trustRationale":string,"answer":string}. Every evidence ID cited by an assertion must exist in evidence. The trust score must reflect evidence quality, provenance, corroboration, recency, contradictions, and unresolved uncertainty—not writing quality.`,
      input: [{ role: "user", content: `Workspace note title: ${note.title}\n\nSource text:\n${note.body}\n\nVerification context and requested checks:\n${parsed.data.context}` }, ...parsed.data.messages],
    }),
  });
  if (!response.ok) return NextResponse.json({ error: "Verification service could not complete the check.", detail: (await response.text()).slice(0, 500) }, { status: response.status || 502 });
  const raw = responseText(await response.json());
  let decoded: unknown; try { decoded = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "")); } catch { return NextResponse.json({ error: "Verification service returned an unreadable findings report." }, { status: 502 }); }
  const finding = FindingSchema.safeParse(decoded); if (!finding.success) return NextResponse.json({ error: "Verification service returned an incomplete findings report." }, { status: 502 });
  return NextResponse.json({ note: { id: note.id, title: note.title, updatedAt: note.updated_at }, ...finding.data });
}
