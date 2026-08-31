"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Workspace } from "@/ui";
import { api, ApiError } from "@/lib/client-api";

type Note = { id: string; title: string; body: string; updatedAt: string };
type ChatMessage = { role: "user" | "assistant"; content: string };
type Verification = {
  note: { id: string; title: string; updatedAt: string }; summary: string; method: string[];
  confirmed: { assertion: string; status: "confirmed" | "partially-confirmed" | "unconfirmed" | "contradicted"; explanation: string; evidenceIds: string[] }[];
  evidence: { id: string; title: string; url: string; publisher: string; relevance: string }[];
  uncertainty: string[]; trustScore: number; trustRationale: string; answer: string;
};

export default function VerifyPage() {
  const [notes, setNotes] = useState<Note[]>([]); const [noteId, setNoteId] = useState(""); const [context, setContext] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [chatInput, setChatInput] = useState(""); const [findings, setFindings] = useState<Verification | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const conversationRef = useRef<HTMLDivElement>(null);

  const loadNotes = useCallback(async () => { const list = await api<Note[]>("/api/v1/notes"); setNotes(list); setNoteId((current) => list.some((note) => note.id === current) ? current : list[0]?.id ?? ""); }, []);
  useEffect(() => { void loadNotes().catch((reason) => { if (!(reason instanceof ApiError && reason.status === 401)) setError(reason instanceof Error ? reason.message : "Could not load Workspace notes."); }); }, [loadNotes]);
  useEffect(() => { const element = conversationRef.current; if (element) element.scrollTop = element.scrollHeight; }, [messages, busy]);
  useEffect(() => { setMessages([]); setFindings(null); setError(null); }, [noteId]);

  async function verify(nextMessages: ChatMessage[]) {
    if (!noteId || !context.trim()) return; setBusy(true); setError(null);
    try { const result = await api<Verification>("/api/v1/verify-note", { method: "POST", body: JSON.stringify({ noteId, context, messages: nextMessages }) }); setFindings(result); setMessages([...nextMessages, { role: "assistant", content: result.answer }]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Verification failed."); }
    finally { setBusy(false); }
  }
  function startVerify() { setMessages([]); setFindings(null); void verify([]); }
  function sendFollowUp(event: FormEvent) { event.preventDefault(); const text = chatInput.trim(); if (!text || busy || !findings) return; const next = [...messages, { role: "user" as const, content: text }]; setMessages(next); setChatInput(""); void verify(next); }

  return <Workspace title="Verify" subtitle={findings ? `${findings.note.title} · evidence review` : "Verify a Workspace note against factual evidence"}>
    <div className="ms-verify-grid">
      <section className="ms-verify-interaction">
        <div className="ms-verify-controls">
          <label>Workspace source<select className="ms-select" aria-label="Workspace source" value={noteId} onChange={(event) => setNoteId(event.target.value)}><option value="">{notes.length ? "Choose a note…" : "No Workspace notes"}</option>{notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}</select></label>
          <label>Context<textarea className="ms-textarea" aria-label="Verification context" value={context} onChange={(event) => setContext(event.target.value)} placeholder="Add background and state exactly what you want verified about this note." /></label>
          <button type="button" className="ms-btn ms-btn-primary" disabled={busy || !noteId || !context.trim()} onClick={startVerify}>{busy && !findings ? "Verifying…" : "Start Verify"}</button>
        </div>
        <div className="ms-verify-chat" aria-label="Verification conversation">
          <div className="ms-verify-messages" ref={conversationRef}>{messages.length ? messages.map((message, index) => <article className={`ms-verify-message is-${message.role}`} key={`${message.role}-${index}`}><strong>{message.role === "assistant" ? "Verify" : "You"}</strong><p>{message.content}</p></article>) : <div className="ms-verify-empty"><strong>Evidence-focused verification</strong><p>Select a Workspace note, provide context, and start. Verify will identify factual assertions, seek provenance and corroboration, and clearly label uncertainty.</p></div>}{busy && findings ? <p className="ms-muted">Checking evidence…</p> : null}</div>
          <form className="ms-verify-chat-input" onSubmit={sendFollowUp}><input aria-label="Ask about these findings" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={findings ? "Ask about evidence, provenance, or uncertainty…" : "Start verification to ask follow-up questions"} disabled={!findings || busy} /><button type="submit" disabled={!findings || busy || !chatInput.trim()}>Send</button></form>
        </div>
        {error ? <p className="ms-sev-critical">{error}</p> : null}
      </section>
      <aside className="ms-panel ms-verify-findings">
        <h2 className="ms-panel-title">Findings</h2>
        {!findings ? <div className="ms-verify-findings-empty"><p>Findings appear here after verification.</p><small>The report will show method, confirmed assertions, supporting evidence, uncertainty, and a grounded trust score.</small></div> : <>
          <div className="ms-trust-score"><span>{findings.trustScore}</span><div><strong>Evidence trust score</strong><p>{findings.trustRationale}</p></div></div>
          <section><h3>How it was checked</h3><p>{findings.summary}</p><ol>{findings.method.map((step) => <li key={step}>{step}</li>)}</ol></section>
          <section><h3>Assertions</h3>{findings.confirmed.map((item, index) => <article className="ms-verified-assertion" key={`${item.assertion}-${index}`}><span className={`is-${item.status}`}>{item.status}</span><strong>{item.assertion}</strong><p>{item.explanation}</p>{item.evidenceIds.length ? <small>Evidence: {item.evidenceIds.join(", ")}</small> : null}</article>)}</section>
          <section><h3>Sources and evidence</h3>{findings.evidence.length ? findings.evidence.map((item) => <article className="ms-verify-evidence" key={item.id}><span>{item.id}</span><div><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a><small>{item.publisher} · {item.relevance}</small></div></article>) : <p className="ms-muted">No supporting external evidence was found.</p>}</section>
          <section><h3>Uncertainty</h3>{findings.uncertainty.length ? <ul>{findings.uncertainty.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No material uncertainty was reported.</p>}</section>
        </>}
      </aside>
    </div>
  </Workspace>;
}
