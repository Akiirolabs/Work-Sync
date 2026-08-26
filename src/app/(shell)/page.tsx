"use client";

import { Workspace } from "@/ui";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-api";

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
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    setSaved(await api<Note[]>("/api/v1/notes"));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as { body?: string; activeId?: string | null };
          setBody(draft.body ?? "");
          setActiveId(draft.activeId ?? null);
        }
      } catch {
        /* ignore bad draft */
      }
      setReady(true);
    })();
  }, [load]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ body, activeId }));
  }, [body, activeId, ready]);

  function newNote() {
    setActiveId(null);
    setBody("");
    setError(null);
  }

  function openNote(note: Note) {
    setActiveId(note.id);
    setBody(note.body);
    setError(null);
  }

  async function saveNote() {
    setBusy(true);
    setError(null);
    try {
      if (activeId) {
        const updated = await api<Note>(`/api/v1/notes/${activeId}`, {
          method: "PATCH",
          body: JSON.stringify({ body }),
        });
        setSaved((prev) => [updated, ...prev.filter((n) => n.id !== updated.id)]);
      } else {
        const created = await api<Note>("/api/v1/notes", {
          method: "POST",
          body: JSON.stringify({ body }),
        });
        setSaved((prev) => [created, ...prev]);
        setActiveId(created.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

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
          <button type="button" className="ms-btn" onClick={newNote} disabled={busy}>
            New
          </button>
          {activeId ? (
            <button type="button" className="ms-btn" onClick={() => void deleteNote()} disabled={busy}>
              Delete
            </button>
          ) : null}
          <button
            type="button"
            className="ms-btn ms-btn-primary"
            onClick={() => void saveNote()}
            disabled={busy}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      {error ? <p className="ms-sev-critical">{error}</p> : null}
      <div className="ms-notes-layout">
        <div className="ms-panel ms-notes-field">
          <textarea
            className="ms-textarea ms-notes-open"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a note…"
            aria-label="Note"
            spellCheck
          />
        </div>
        <aside className="ms-panel ms-notes-saved">
          <h2 className="ms-panel-title">Saved notes</h2>
          <div className="ms-stack">
            {saved.map((note) => (
              <button
                key={note.id}
                type="button"
                className={`ms-rail-item${note.id === activeId ? " is-active" : ""}`}
                onClick={() => openNote(note)}
              >
                <span>{note.title}</span>
                <span className="ms-mono ms-muted">
                  {new Date(note.updatedAt).toLocaleString()}
                </span>
              </button>
            ))}
            {saved.length === 0 ? <p className="ms-muted">No notes yet.</p> : null}
          </div>
        </aside>
      </div>
    </Workspace>
  );
}
