"use client";

import { Workspace } from "@/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import { userStorageKey } from "@/lib/user-storage";
import { LineEditor } from "@/components/LineEditor";
import { AO_WORKSPACE_OPEN_EVENT, AO_WORKSPACE_OPEN_KEY, AO_WORKSPACE_TEXT_EVENT, AO_WORKSPACE_TEXT_KEY } from "@/lib/ao-macro";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

const DRAFT_KEY = "work-sync:workspace-draft";

export default function WorkspacePage() {
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const creating = useRef(false);
  const persistedNote = useRef<{ id: string | null; body: string }>({ id: null, body: "" });
  const [ready, setReady] = useState(false);
  const [savedPanelOpen, setSavedPanelOpen] = useState(true);
  const [noteMenu, setNoteMenu] = useState<{ id: string; left: number; top: number } | null>(null); const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null); const [renameDraft, setRenameDraft] = useState("");

  const load = useCallback(async () => {
    setSaved(await api<Note[]>("/api/v1/notes"));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 401)) setError(e instanceof Error ? e.message : "Failed to load");
      }
      try {
        const raw = localStorage.getItem(userStorageKey(DRAFT_KEY));
        if (raw) {
          const draft = JSON.parse(raw) as { body?: string; activeId?: string | null };
          const restoredBody = draft.body ?? ""; const restoredId = draft.activeId ?? null;
          persistedNote.current = { id: restoredId, body: restoredBody };
          setBody(restoredBody);
          setActiveId(restoredId);
        }
      } catch {
        /* ignore bad draft */
      }
      persistedNote.current = persistedNote.current.body ? persistedNote.current : { id: null, body: "" };
      setReady(true);
    })();
  }, [load]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(userStorageKey(DRAFT_KEY), JSON.stringify({ body, activeId }));
  }, [body, activeId, ready]);

  useEffect(() => {
    if (!ready) return;
    function consumeAOText() {
      const text = localStorage.getItem(userStorageKey(AO_WORKSPACE_TEXT_KEY))?.trim();
      if (!text) return;
      localStorage.removeItem(userStorageKey(AO_WORKSPACE_TEXT_KEY));
      setActiveId(null);
      setBody((current) => {
        const next = current.trim() ? `${current.trimEnd()}\n${text}` : text;
        persistedNote.current = { id: null, body: current };
        return next;
      });
    }
    consumeAOText();
    window.addEventListener(AO_WORKSPACE_TEXT_EVENT, consumeAOText);
    return () => window.removeEventListener(AO_WORKSPACE_TEXT_EVENT, consumeAOText);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    function consumeAOOpen() {
      const raw = localStorage.getItem(userStorageKey(AO_WORKSPACE_OPEN_KEY));
      if (!raw) return;
      localStorage.removeItem(userStorageKey(AO_WORKSPACE_OPEN_KEY));
      try {
        const note = JSON.parse(raw) as { id?: unknown; body?: unknown };
        if (typeof note.id !== "string" || typeof note.body !== "string") return;
        persistedNote.current = { id: note.id, body: note.body };
        setActiveId(note.id);
        setBody(note.body);
        setError(null);
        void load();
      } catch { /* ignore invalid AO note targets */ }
    }
    consumeAOOpen();
    window.addEventListener(AO_WORKSPACE_OPEN_EVENT, consumeAOOpen);
    return () => window.removeEventListener(AO_WORKSPACE_OPEN_EVENT, consumeAOOpen);
  }, [ready, load]);

  useEffect(() => { function dismiss(event: PointerEvent) { if (!(event.target instanceof Element && event.target.closest("[data-note-actions]"))) setNoteMenu(null); } document.addEventListener("pointerdown", dismiss); return () => document.removeEventListener("pointerdown", dismiss); }, []);

  function newNote() {
    persistedNote.current = { id: null, body: "" };
    setActiveId(null);
    setBody("");
    setError(null);
  }

  function openNote(note: Note) {
    persistedNote.current = { id: note.id, body: note.body };
    setActiveId(note.id);
    setBody(note.body);
    setError(null);
  }

  useEffect(() => {
    const hasUnsavedEdit = persistedNote.current.id !== activeId || persistedNote.current.body !== body;
    if (!ready || !body.trim() || !hasUnsavedEdit) return;
    const timer = window.setTimeout(async () => {
      if (creating.current) return; setBusy(true); setError(null);
      try {
        if (activeId) { const updated = await api<Note>(`/api/v1/notes/${activeId}`, { method: "PATCH", body: JSON.stringify({ body }) }); persistedNote.current = { id: updated.id, body: updated.body }; setSaved((prev) => [updated, ...prev.filter((note) => note.id !== updated.id)]); }
        else { creating.current = true; const created = await api<Note>("/api/v1/notes", { method: "POST", body: JSON.stringify({ body }) }); const draftMeta = localStorage.getItem(userStorageKey("work-sync:line-meta:draft")); if (draftMeta) localStorage.setItem(userStorageKey(`work-sync:line-meta:${created.id}`), draftMeta); persistedNote.current = { id: created.id, body: created.body }; setSaved((prev) => [created, ...prev]); setActiveId(created.id); }
      } catch (e) { setError(e instanceof ApiError && e.status === 401 ? "Sign in to save notes." : e instanceof Error ? e.message : "Auto-save failed"); }
      finally { creating.current = false; setBusy(false); }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activeId, body, ready]);

  async function deleteNote() {
    if (!activeId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/notes/${activeId}`, { method: "DELETE" });
      setSaved((prev) => prev.filter((n) => n.id !== activeId));
      newNote();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSavedNote(note: Note) {
    setBusy(true); setError(null);
    try { await api(`/api/v1/notes/${note.id}`, { method: "DELETE" }); setSaved((current) => current.filter((item) => item.id !== note.id)); if (activeId === note.id) newNote(); setNoteMenu(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Delete failed"); }
    finally { setBusy(false); }
  }
  function bodyWithTitle(note: Note, title: string) { const lines = note.body.split("\n"); const index = lines.findIndex((line) => line.trim()); if (index < 0) return title; lines[index] = title; return lines.join("\n"); }
  async function renameSavedNote(note: Note) {
    const title = renameDraft.trim(); if (!title) return;
    setBusy(true); setError(null);
    try { const updated = await api<Note>(`/api/v1/notes/${note.id}`, { method: "PATCH", body: JSON.stringify({ title, body: bodyWithTitle(note, title) }) }); setSaved((current) => current.map((item) => item.id === updated.id ? updated : item)); if (activeId === updated.id) { persistedNote.current = { id: updated.id, body: updated.body }; setBody(updated.body); } setRenamingNoteId(null); setNoteMenu(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Rename failed"); }
    finally { setBusy(false); }
  }
  async function duplicateSavedNote(note: Note) {
    const title = `${note.title} copy`; setBusy(true); setError(null);
    try { const copy = await api<Note>("/api/v1/notes", { method: "POST", body: JSON.stringify({ title, body: bodyWithTitle(note, title) }) }); setSaved((current) => [copy, ...current]); setNoteMenu(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Duplicate failed"); }
    finally { setBusy(false); }
  }

  return (
    <Workspace
      title="Workspace"
      subtitle="Open field · saved notes"
      actions={
        <div className="ms-row">
          <button type="button" className="ms-btn" onClick={newNote} disabled={busy}>
            New
          </button>
          {activeId ? (
            <button type="button" className="ms-btn" onClick={() => void deleteNote()} disabled={busy}>
              Delete
            </button>
          ) : null}
          <button type="button" className="ms-btn" aria-controls="saved-notes-panel" aria-expanded={savedPanelOpen} onClick={() => setSavedPanelOpen((open) => !open)}>
            {savedPanelOpen ? "Hide saved notes" : "Show saved notes"}
          </button>
          <span className="ms-muted">{busy ? "Saving…" : "Saved to cloud"}</span>
        </div>
      }
    >
      {error ? <p className="ms-sev-critical">{error}</p> : null}
      <div className={`ms-notes-layout${savedPanelOpen ? " has-saved-panel" : ""}`}>
        <div className="ms-panel ms-notes-field">
          <LineEditor value={body} onChange={setBody} storageKey={activeId ?? "draft"} />
        </div>
        {savedPanelOpen ? <aside className="ms-panel ms-notes-saved" id="saved-notes-panel">
          <h2 className="ms-panel-title">Saved notes</h2>
          <div className="ms-stack">
            {saved.map((note) => <div className={`ms-saved-note-row${note.id === activeId ? " is-active" : ""}`} key={note.id} data-note-actions>
              {renamingNoteId === note.id ? <form onSubmit={(event) => { event.preventDefault(); void renameSavedNote(note); }}><input aria-label={`Edit title for ${note.title}`} value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} autoFocus /><button type="submit">Save</button></form> : <button type="button" className="ms-saved-note-open" onClick={() => openNote(note)}><span>{note.title}</span><span className="ms-mono ms-muted">{new Date(note.updatedAt).toLocaleString()}</span></button>}
              <button type="button" className="ms-note-more" aria-label={`Options for ${note.title}`} aria-haspopup="menu" aria-expanded={noteMenu?.id === note.id} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setNoteMenu((current) => current?.id === note.id ? null : { id: note.id, left: Math.max(8, rect.right - 162), top: Math.min(window.innerHeight - 126, rect.bottom + 4) }); }}>⋯</button>
              {noteMenu?.id === note.id && <div className="ms-note-menu" data-note-actions role="menu" style={{ left: noteMenu.left, top: noteMenu.top }}><button type="button" onClick={() => { setRenamingNoteId(note.id); setRenameDraft(note.title); setNoteMenu(null); }}>Edit title</button><button type="button" onClick={() => void duplicateSavedNote(note)}>Duplicate</button><button type="button" className="is-danger" onClick={() => void deleteSavedNote(note)}>Delete</button></div>}
            </div>)}
            {saved.length === 0 ? <p className="ms-muted">No notes yet.</p> : null}
          </div>
        </aside> : null}
      </div>
    </Workspace>
  );
}
