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
  const [noteMenuOpen, setNoteMenuOpen] = useState(false);

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

  useEffect(() => { function dismiss(event: PointerEvent) { if (!(event.target instanceof Element && event.target.closest("[data-workspace-note-actions]"))) setNoteMenuOpen(false); } document.addEventListener("pointerdown", dismiss); return () => document.removeEventListener("pointerdown", dismiss); }, []);

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

  async function saveCurrentNote() {
    if (!body.trim() || creating.current) return;
    setBusy(true); setError(null);
    try {
      if (activeId) { const updated = await api<Note>(`/api/v1/notes/${activeId}`, { method: "PATCH", body: JSON.stringify({ body }) }); persistedNote.current = { id: updated.id, body: updated.body }; setSaved((prev) => [updated, ...prev.filter((note) => note.id !== updated.id)]); }
      else { creating.current = true; const created = await api<Note>("/api/v1/notes", { method: "POST", body: JSON.stringify({ body }) }); const draftMeta = localStorage.getItem(userStorageKey("work-sync:line-meta:draft")); if (draftMeta) localStorage.setItem(userStorageKey(`work-sync:line-meta:${created.id}`), draftMeta); persistedNote.current = { id: created.id, body: created.body }; setSaved((prev) => [created, ...prev]); setActiveId(created.id); }
    } catch (e) { setError(e instanceof ApiError && e.status === 401 ? "Sign in to save notes." : e instanceof Error ? e.message : "Save failed"); }
    finally { creating.current = false; setBusy(false); }
  }

  useEffect(() => {
    const hasUnsavedEdit = persistedNote.current.id !== activeId || persistedNote.current.body !== body;
    if (!ready || !body.trim() || !hasUnsavedEdit) return;
    const timer = window.setTimeout(() => { void saveCurrentNote(); }, 700);
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

  return (
    <Workspace
      title="Workspace"
      subtitle="Open field · saved notes"
      actions={
        <div className="ms-row">
          <div className="ms-workspace-note-actions" data-workspace-note-actions>
            <label className="ms-workspace-note-picker">
            <span>Notes</span>
            <select aria-label="Select Workspace note" value={activeId ?? ""} onChange={(event) => { const note = saved.find((item) => item.id === event.target.value); if (note) openNote(note); else newNote(); }}>
              <option value="">New note</option>
              {saved.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
            </select>
            </label>
            <button type="button" className="ms-workspace-note-more" aria-label="Workspace note options" aria-haspopup="menu" aria-expanded={noteMenuOpen} onClick={() => setNoteMenuOpen((open) => !open)}>⋯</button>
            {noteMenuOpen && <div className="ms-workspace-note-menu" role="menu"><button type="button" onClick={() => { void saveCurrentNote(); setNoteMenuOpen(false); }} disabled={busy || !body.trim()}>Save</button><button type="button" className="is-danger" onClick={() => { void deleteNote(); setNoteMenuOpen(false); }} disabled={busy || !activeId}>Delete</button></div>}
          </div>
          <button type="button" className="ms-btn" onClick={newNote} disabled={busy}>
            New
          </button>
          <span className="ms-muted">{busy ? "Saving…" : "Saved to cloud"}</span>
        </div>
      }
    >
      {error ? <p className="ms-sev-critical">{error}</p> : null}
      <div className="ms-notes-layout">
        <div className="ms-panel ms-notes-field">
          <LineEditor value={body} onChange={setBody} storageKey={activeId ?? "draft"} />
        </div>
      </div>
    </Workspace>
  );
}
