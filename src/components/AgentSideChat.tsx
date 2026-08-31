"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AgentSideChat.module.css";
import { userStorageKey } from "@/lib/user-storage";

type Message = { id: string; role: "user" | "agent"; text: string; final: boolean };
type TextStreamEvent = { type?: string; delta?: string; error?: { message?: string } };
const AGENT_CHAT_STORAGE_KEY = "work-sync:agent-conversation";

export function AgentSideChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const chatEnd = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(userStorageKey(AGENT_CHAT_STORAGE_KEY)) ?? "[]") as Message[];
      if (Array.isArray(stored)) setMessages(stored.filter((item) => item && (item.role === "user" || item.role === "agent") && typeof item.text === "string").map((item) => ({ ...item, final: true })).slice(-80));
    } catch { /* ignore invalid saved chat */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(userStorageKey(AGENT_CHAT_STORAGE_KEY), JSON.stringify(messages.filter((item) => item.final).slice(-80))); }, [messages, ready]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages]);
  function appendReply(id: string, delta: string) { setMessages((current) => current.map((item) => item.id === id ? { ...item, text: item.text + delta } : item)); }
  function finishReply(id: string) { setMessages((current) => current.map((item) => item.id === id ? { ...item, final: true } : item)); }

  async function send() {
    const text = draft.trim(); if (!text || busy) return;
    const history = messages.filter((item) => item.final && item.text.trim()).map((item) => ({ role: item.role === "agent" ? "assistant" as const : "user" as const, content: item.text }));
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text, final: true }; const replyId = crypto.randomUUID();
    setDraft(""); setError(""); setBusy(true); setMessages((current) => [...current, userMessage, { id: replyId, role: "agent", text: "", final: false }]);
    try {
      const response = await fetch("/api/v1/agent/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [...history, { role: "user", content: text }] }) });
      if (!response.ok || !response.body) { const body = await response.json().catch(() => ({})) as { error?: string }; throw new Error(body.error ?? "Agent could not answer."); }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let received = false;
      while (true) {
        const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n"); buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const data = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join(""); if (!data || data === "[DONE]") continue;
          let event: TextStreamEvent; try { event = JSON.parse(data) as TextStreamEvent; } catch { continue; }
          if (event.type === "response.output_text.delta" && event.delta) { received = true; appendReply(replyId, event.delta); }
          if (event.type === "error") throw new Error(event.error?.message ?? "Agent could not answer.");
        }
      }
      if (!received) throw new Error("Agent returned an empty response."); finishReply(replyId);
    } catch (cause) { setMessages((current) => current.filter((item) => item.id !== replyId)); setError(cause instanceof Error ? cause.message : "Agent could not answer."); }
    finally { setBusy(false); }
  }

  if (!open) return null;
  return <aside className={`${styles.panel} agent-side-chat`} aria-label="Agent side chat">
    <header><div><strong>Agent</strong><small>gpt-5-mini · text chat · no tools</small></div><button type="button" aria-label="Close Agent" onClick={onClose}>×</button></header>
    <div className={styles.chat} aria-live="polite" aria-label="Agent conversation">
      {messages.length ? messages.map((item) => <div key={item.id} className={`${item.role === "user" ? styles.user : styles.agent}${item.final ? "" : ` ${styles.live}`}`}><small>{item.role === "user" ? "You" : "Agent"}</small><p>{item.text || "Thinking…"}</p></div>) : <p className={styles.empty}>Start a conversation with Agent.</p>}
      <div ref={chatEnd} />
    </div>
    {error && <p className={styles.error}>{error}</p>}
    <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void send(); }}><textarea aria-label="Message Agent" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Message Agent…" rows={2} autoFocus /><button type="submit" disabled={!draft.trim() || busy}>{busy ? "…" : "Send"}</button></form>
  </aside>;
}
