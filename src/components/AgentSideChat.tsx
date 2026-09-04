"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./AgentSideChat.module.css";
import { AO_TABLE_COMMAND_EVENT, AO_TABLE_COMMAND_KEY, AO_WORKSPACE_TEXT_EVENT, AO_WORKSPACE_TEXT_KEY } from "@/lib/ao-macro";
import { AO_TODO_COMMAND_EVENT, AO_TODO_COMMAND_KEY } from "@/lib/todo-model";
import { userStorageKey } from "@/lib/user-storage";

type Message = { id: string; role: "user" | "agent"; text: string; final: boolean };
type SavedChat = { id: string; name: string; messages: Message[]; updatedAt: string };
type Destination = "workspace" | "todo" | "tables" | "verify";
type TextStreamEvent = { type?: string; delta?: string; error?: { message?: string } };
const AGENT_CHAT_STORAGE_KEY = "work-sync:agent-conversation";
const AGENT_CHAT_HISTORY_KEY = "work-sync:agent-chat-history";
const AGENT_VERIFY_CONTEXT_KEY = "work-sync:agent-verify-context";
const shortTitle = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 52) || "Agent conversation";

export function AgentSideChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter(); const pathname = usePathname(); const chatEnd = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); const [draft, setDraft] = useState(""); const [activeChatId, setActiveChatId] = useState("");
  const [history, setHistory] = useState<SavedChat[]>([]); const [historyOpen, setHistoryOpen] = useState(false); const [selectingOutput, setSelectingOutput] = useState(false); const [selectedOutput, setSelectedOutput] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = crypto.randomUUID(); let legacy: Message[] = []; let saved: SavedChat[] = [];
    try { const stored = JSON.parse(localStorage.getItem(userStorageKey(AGENT_CHAT_STORAGE_KEY)) ?? "[]") as Message[]; if (Array.isArray(stored)) legacy = stored.filter((item) => item && (item.role === "user" || item.role === "agent") && typeof item.text === "string").map((item) => ({ ...item, final: true })).slice(-80); } catch { /* ignore invalid saved chat */ }
    try { const stored = JSON.parse(localStorage.getItem(userStorageKey(AGENT_CHAT_HISTORY_KEY)) ?? "[]") as SavedChat[]; if (Array.isArray(stored)) saved = stored.filter((item) => item && typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.messages)).slice(0, 30); } catch { /* ignore invalid saved history */ }
    if (!saved.length && legacy.length) saved = [{ id, name: shortTitle(legacy.find((item) => item.role === "user")?.text ?? "Previous conversation"), messages: legacy, updatedAt: new Date().toISOString() }];
    const active = saved[0]; setHistory(saved); setActiveChatId(active?.id ?? id); setMessages(active?.messages ?? legacy); setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(userStorageKey(AGENT_CHAT_STORAGE_KEY), JSON.stringify(messages.filter((item) => item.final).slice(-80))); }, [messages, ready]);
  useEffect(() => { if (ready) localStorage.setItem(userStorageKey(AGENT_CHAT_HISTORY_KEY), JSON.stringify(history.slice(0, 30))); }, [history, ready]);
  useEffect(() => {
    if (!ready || !activeChatId || !messages.some((item) => item.final && item.text.trim())) return;
    const complete = messages.filter((item) => item.final).slice(-80); const name = shortTitle(complete.find((item) => item.role === "user")?.text ?? "Agent conversation");
    setHistory((current) => [{ id: activeChatId, name, messages: complete, updatedAt: new Date().toISOString() }, ...current.filter((item) => item.id !== activeChatId)].slice(0, 30));
  }, [messages, activeChatId, ready]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages]);
  function appendReply(id: string, delta: string) { setMessages((current) => current.map((item) => item.id === id ? { ...item, text: item.text + delta } : item)); }
  function finishReply(id: string) { setMessages((current) => current.map((item) => item.id === id ? { ...item, final: true } : item)); }
  function newChat() { setActiveChatId(crypto.randomUUID()); setMessages([]); setDraft(""); setError(""); setHistoryOpen(false); setSelectingOutput(false); setSelectedOutput(null); }
  function openChat(chat: SavedChat) { setActiveChatId(chat.id); setMessages(chat.messages); setHistoryOpen(false); setSelectingOutput(false); setSelectedOutput(null); }
  function dispatchDestination(destination: Destination) {
    const text = selectedOutput?.text.trim(); if (!text) return;
    if (destination === "workspace") { localStorage.setItem(userStorageKey(AO_WORKSPACE_TEXT_KEY), text); if (pathname === "/") window.dispatchEvent(new Event(AO_WORKSPACE_TEXT_EVENT)); else router.push("/"); }
    if (destination === "todo") { localStorage.setItem(userStorageKey(AO_TODO_COMMAND_KEY), JSON.stringify({ action: "todo-add-detailed", title: shortTitle(text), description: text })); if (pathname === "/todo") window.dispatchEvent(new Event(AO_TODO_COMMAND_EVENT)); else router.push("/todo"); }
    if (destination === "tables") { localStorage.setItem(userStorageKey(AO_TABLE_COMMAND_KEY), JSON.stringify({ action: "agent-output-page", title: shortTitle(text), text })); if (pathname === "/tables") window.dispatchEvent(new Event(AO_TABLE_COMMAND_EVENT)); else router.push("/tables"); }
    if (destination === "verify") { localStorage.setItem(userStorageKey(AGENT_VERIFY_CONTEXT_KEY), text); router.push("/verify"); }
    setSelectedOutput(null); setSelectingOutput(false); onClose();
  }

  async function send() {
    const text = draft.trim(); if (!text || busy) return;
    const historyForRequest = messages.filter((item) => item.final && item.text.trim()).map((item) => ({ role: item.role === "agent" ? "assistant" as const : "user" as const, content: item.text }));
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text, final: true }; const replyId = crypto.randomUUID();
    setDraft(""); setError(""); setBusy(true); setMessages((current) => [...current, userMessage, { id: replyId, role: "agent", text: "", final: false }]);
    try {
      const response = await fetch("/api/v1/agent/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [...historyForRequest, { role: "user", content: text }] }) });
      if (!response.ok || !response.body) { const body = await response.json().catch(() => ({})) as { error?: string }; throw new Error(body.error ?? "Agent could not answer."); }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let received = false;
      while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const blocks = buffer.split("\n\n"); buffer = blocks.pop() ?? "";
        for (const block of blocks) { const data = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join(""); if (!data || data === "[DONE]") continue; let event: TextStreamEvent; try { event = JSON.parse(data) as TextStreamEvent; } catch { continue; } if (event.type === "response.output_text.delta" && event.delta) { received = true; appendReply(replyId, event.delta); } if (event.type === "error") throw new Error(event.error?.message ?? "Agent could not answer."); }
      }
      if (!received) throw new Error("Agent returned an empty response."); finishReply(replyId);
    } catch (cause) { setMessages((current) => current.filter((item) => item.id !== replyId)); setError(cause instanceof Error ? cause.message : "Agent could not answer."); }
    finally { setBusy(false); }
  }

  if (!open) return null;
  return <aside className={`${styles.panel} agent-side-chat`} aria-label="AO Agent side chat">
    <header><div><strong>AO Agent</strong><small>gpt-5-mini · text chat · no tools</small></div><nav aria-label="AO Agent actions"><button type="button" className={historyOpen ? styles.actionActive : ""} aria-label="Open AO Agent chat history" onClick={() => setHistoryOpen((value) => !value)}>History</button><button type="button" className={selectingOutput ? styles.actionActive : ""} aria-label="Send an Agent output" title="Send an Agent output" onClick={() => { setHistoryOpen(false); setSelectedOutput(null); setSelectingOutput((value) => !value); }}><img src="/ao-agent.png" alt="" /></button><button type="button" aria-label="Close Agent" onClick={onClose}>×</button></nav></header>
    {historyOpen && <section className={styles.history} aria-label="AO Agent chat history"><header><strong>Chat history</strong><button type="button" onClick={newChat}>New chat</button></header><div>{history.length ? history.map((chat) => <button type="button" key={chat.id} className={chat.id === activeChatId ? styles.currentHistory : ""} onClick={() => openChat(chat)}><strong>{chat.name}</strong><small>{new Date(chat.updatedAt).toLocaleString()}</small></button>) : <p>No saved chats yet.</p>}</div></section>}
    {selectingOutput && !selectedOutput && <p className={styles.pickPrompt}>Select an Agent response to send.</p>}
    {selectedOutput && <section className={styles.sendMenu} aria-label="Send selected Agent output"><strong>Send this output to</strong><div><button type="button" onClick={() => dispatchDestination("workspace")}>Workspace Notes</button><button type="button" onClick={() => dispatchDestination("todo")}>To Do</button><button type="button" onClick={() => dispatchDestination("tables")}>Tables page</button><button type="button" onClick={() => dispatchDestination("verify")}>Verify</button></div><button type="button" className={styles.cancelSend} onClick={() => setSelectedOutput(null)}>Cancel</button></section>}
    <div className={styles.chat} aria-live="polite" aria-label="Agent conversation">
      {messages.length ? messages.map((item) => <div key={item.id} className={`${item.role === "user" ? styles.user : styles.agent}${item.final ? "" : ` ${styles.live}`}${selectingOutput && item.role === "agent" && item.final ? ` ${styles.selectable}` : ""}`}><small>{item.role === "user" ? "You" : "AO Agent"}</small><p>{item.text || "Thinking…"}</p>{selectingOutput && item.role === "agent" && item.final && <button type="button" className={styles.selectOutput} onClick={() => setSelectedOutput(item)}>Send this output</button>}</div>) : <p className={styles.empty}>Start a conversation with AO Agent.</p>}
      <div ref={chatEnd} />
    </div>
    {error && <p className={styles.error}>{error}</p>}
    <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void send(); }}><textarea aria-label="Message AO Agent" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Message AO Agent…" rows={2} /><button type="submit" disabled={!draft.trim() || busy}>{busy ? "…" : "Send"}</button></form>
  </aside>;
}
