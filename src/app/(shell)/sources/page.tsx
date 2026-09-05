"use client";

import { Workspace } from "@/ui";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { userStorageKey } from "@/lib/user-storage";

type WorkspaceNote = { id: string; title: string; body: string; updatedAt: string };
type FoundSource = { title: string; url: string; publisher: string; summary: string; trustReason: string };
type SavedSourceResult = { id: string; name: string; noteId: string; noteTitle: string; request: string; sources: FoundSource[]; updatedAt: string };
const SOURCES_OPEN_RESULT_KEY = "work-sync:sources-open-result";

export default function SourcesPage() {
  const [notes, setNotes] = useState<WorkspaceNote[]>([]), [noteId, setNoteId] = useState(""), [name, setName] = useState(""), [request, setRequest] = useState(""), [results, setResults] = useState<FoundSource[]>([]);
  const [history, setHistory] = useState<SavedSourceResult[]>([]), [historyMenu, setHistoryMenu] = useState<string | null>(null), [historyKey, setHistoryKey] = useState(""), [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const list = await api<WorkspaceNote[]>("/api/v1/notes"); setNotes(list); setNoteId((current) => list.some((note) => note.id === current) ? current : list[0]?.id ?? ""); }, []);
  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Failed to load Workspace Notes.")); }, [load]);
  useEffect(() => { setHistoryKey(userStorageKey("work-sync:source-results")); }, []);
  useEffect(() => { if (!historyKey) return; try { setHistory(JSON.parse(localStorage.getItem(historyKey) ?? "[]")); } catch { setHistory([]); } setHistoryLoaded(true); }, [historyKey]);
  useEffect(() => { if (historyKey && historyLoaded) localStorage.setItem(historyKey, JSON.stringify(history)); }, [history, historyKey, historyLoaded]);
  useEffect(() => {
    if (!historyLoaded || !historyKey) return;
    const openId = localStorage.getItem(userStorageKey(SOURCES_OPEN_RESULT_KEY)); const item = history.find((entry) => entry.id === openId);
    if (item) { setName(item.name); setNoteId(item.noteId); setRequest(item.request); setResults(item.sources); localStorage.removeItem(userStorageKey(SOURCES_OPEN_RESULT_KEY)); }
  }, [history, historyKey, historyLoaded]);

  async function findSources(event: React.FormEvent) {
    event.preventDefault(); if (!noteId || !name.trim() || !request.trim()) return;
    setBusy(true); setError(null);
    try {
      const [result] = await Promise.all([
        api<{ note: { id: string; title: string }; sources: FoundSource[] }>("/api/v1/sources/find", { method: "POST", body: JSON.stringify({ noteId, notes: request }) }),
        api("/api/v1/sources", { method: "POST", body: JSON.stringify({ name: name.trim(), workspaceNoteId: noteId, notes: request.trim() }) }),
      ]);
      const saved: SavedSourceResult = { id: crypto.randomUUID(), name: name.trim(), noteId: result.note.id, noteTitle: result.note.title, request: request.trim(), sources: result.sources, updatedAt: new Date().toISOString() };
      setResults(result.sources); setHistory((current) => [saved, ...current]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Source research failed."); }
    finally { setBusy(false); }
  }
  function openResult(item: SavedSourceResult) { setName(item.name); setNoteId(item.noteId); setRequest(item.request); setResults(item.sources); setHistoryMenu(null); }
  function renameResult(item: SavedSourceResult) { const next = window.prompt("Name this source-result version", item.name)?.trim(); if (next) setHistory((current) => current.map((entry) => entry.id === item.id ? { ...entry, name: next } : entry)); setHistoryMenu(null); }

  return <Workspace title="Sources" subtitle="Research trusted sources from a Workspace Note"><div className="ms-sources-grid">
    <form className="ms-panel" onSubmit={findSources}><h2 className="ms-panel-title">Source log</h2>
      <div className="ms-field"><label className="ms-label" htmlFor="source-name">Name</label><input id="source-name" className="ms-input" value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} placeholder="Your label for this source log" /></div>
      <div className="ms-field"><label className="ms-label" htmlFor="workspace-note-source">Workspace Notes</label><select id="workspace-note-source" className="ms-select" value={noteId} onChange={(event) => setNoteId(event.target.value)} required><option value="">{notes.length ? "Choose a Workspace Note…" : "No Workspace Notes"}</option>{notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}</select></div>
      <div className="ms-field"><label className="ms-label" htmlFor="source-request">Notes</label><textarea id="source-request" className="ms-textarea" value={request} onChange={(event) => setRequest(event.target.value)} required maxLength={8_000} placeholder="State the subject and what sources you want to find." /></div>
      {error ? <p className="ms-sev-critical">{error}</p> : null}<button className="ms-btn ms-btn-primary" type="submit" disabled={busy || !noteId}>{busy ? "Finding trusted sources…" : "Find sources"}</button>
    </form>
    <section className="ms-panel ms-all-sources"><h2 className="ms-panel-title">All Sources</h2>{results.length ? <div className="ms-source-results">{results.map((source) => <article key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><small>{source.publisher}</small><p>{source.summary}</p><em>{source.trustReason}</em></article>)}</div> : <p className="ms-muted">Choose a Workspace Note and request sources. Every returned source will appear here.</p>}</section>
    <section className="ms-compact-history ms-source-history"><header><h2>Saved source results</h2><small>{history.length}</small></header><div>{history.map((item) => <article key={item.id}><button type="button" onClick={() => openResult(item)}>{item.name}<small>{item.noteTitle} · {new Date(item.updatedAt).toLocaleString()}</small></button><button type="button" className="ms-more" aria-label={`Options for ${item.name}`} onClick={() => setHistoryMenu((current) => current === item.id ? null : item.id)}>•••</button>{historyMenu === item.id && <span className="ms-inline-menu"><button onClick={() => renameResult(item)}>Rename</button><button onClick={() => { setHistory((current) => current.filter((entry) => entry.id !== item.id)); setHistoryMenu(null); }}>Delete</button></span>}</article>)}{!history.length && <p className="ms-muted">Completed source searches are saved here.</p>}</div></section>
  </div></Workspace>;
}
