"use client";

import { Workspace } from "@/ui";
import JSZip from "jszip";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { api, ApiError } from "@/lib/client-api";
import { userStorageKey } from "@/lib/user-storage";
import { LineEditor } from "@/components/LineEditor";
import { AO_WORKSPACE_OPEN_EVENT, AO_WORKSPACE_OPEN_KEY, AO_WORKSPACE_PROJECTS_EVENT, AO_WORKSPACE_TEXT_EVENT, AO_WORKSPACE_TEXT_KEY } from "@/lib/ao-macro";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};
type WorkspaceProject = { id: string; title: string };

const DRAFT_KEY = "work-sync:workspace-draft";
const PROJECTS_KEY = "work-sync:workspace-projects";
const NOTE_PROJECTS_KEY = "work-sync:workspace-note-projects";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [[]]; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]; const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { rows[rows.length - 1]!.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") index += 1; rows[rows.length - 1]!.push(cell); rows.push([]); cell = ""; }
    else cell += char;
  }
  rows[rows.length - 1]!.push(cell);
  return rows.filter((row) => row.some((value) => value.trim()));
}

function csvAsWorkspaceText(text: string, fallbackTitle: string) {
  const rows = parseCsv(text); if (!rows.length) return "";
  const headers = rows[0]!.map((value) => value.trim()); const bodyIndex = headers.findIndex((value) => /^(body|content|note)$/i.test(value));
  if (bodyIndex >= 0) return rows.slice(1).map((row) => row[bodyIndex] ?? "").filter(Boolean).join("\n\n");
  const escaped = (value: string) => value.replace(/\|/g, "\\|").replace(/\n/g, "<br />");
  return [`# ${fallbackTitle}`, "", `| ${headers.map(escaped).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.slice(1).map((row) => `| ${headers.map((_, index) => escaped(row[index] ?? "")).join(" | ")} |`)].join("\n");
}

async function docxAsWorkspaceText(file: File) {
  const archive = await JSZip.loadAsync(await file.arrayBuffer()); const documentXml = await archive.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("This Word document does not contain readable document text.");
  const xml = new DOMParser().parseFromString(documentXml, "application/xml");
  return Array.from(xml.getElementsByTagName("w:p")).map((paragraph) => Array.from(paragraph.getElementsByTagName("w:t")).map((part) => part.textContent ?? "").join("")).join("\n").trim();
}

async function createDocx(body: string) {
  const paragraphs = body.split(/\r?\n/).map((line) => line ? `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>` : "<w:p/>").join("");
  const archive = new JSZip();
  archive.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="${DOCX_MIME}.main+xml"/></Types>`);
  archive.folder("_rels")?.file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  archive.folder("word")?.file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`);
  return archive.generateAsync({ type: "blob", mimeType: DOCX_MIME });
}

function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeFileName(value: string) {
  return (value.trim() || "workspace-note").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "workspace-note";
}

export default function WorkspacePage() {
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const creating = useRef(false);
  const persistedNote = useRef<{ id: string | null; body: string }>({ id: null, body: "" });
  const [ready, setReady] = useState(false);
  const [noteMenuOpen, setNoteMenuOpen] = useState(false);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [noteProjects, setNoteProjects] = useState<Record<string, string>>({});
  const [activeProjectId, setActiveProjectId] = useState("all");
  const importInput = useRef<HTMLInputElement>(null);

  const visibleSaved = activeProjectId === "all" ? saved : saved.filter((note) => activeProjectId === "unassigned" ? !noteProjects[note.id] : noteProjects[note.id] === activeProjectId);

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
    function syncProjects() {
      try { const stored = JSON.parse(localStorage.getItem(userStorageKey(PROJECTS_KEY)) ?? "[]") as WorkspaceProject[]; setProjects(Array.isArray(stored) ? stored.filter((project) => typeof project?.id === "string" && typeof project?.title === "string") : []); } catch { setProjects([]); }
      try { const stored = JSON.parse(localStorage.getItem(userStorageKey(NOTE_PROJECTS_KEY)) ?? "{}") as Record<string, string>; setNoteProjects(stored && typeof stored === "object" ? stored : {}); } catch { setNoteProjects({}); }
    }
    syncProjects(); window.addEventListener(AO_WORKSPACE_PROJECTS_EVENT, syncProjects); return () => window.removeEventListener(AO_WORKSPACE_PROJECTS_EVENT, syncProjects);
  }, [ready]);
  useEffect(() => { if (ready) localStorage.setItem(userStorageKey(PROJECTS_KEY), JSON.stringify(projects)); }, [projects, ready]);
  useEffect(() => { if (ready) localStorage.setItem(userStorageKey(NOTE_PROJECTS_KEY), JSON.stringify(noteProjects)); }, [noteProjects, ready]);

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
      else { creating.current = true; const created = await api<Note>("/api/v1/notes", { method: "POST", body: JSON.stringify({ body }) }); const draftMeta = localStorage.getItem(userStorageKey("work-sync:line-meta:draft")); if (draftMeta) localStorage.setItem(userStorageKey(`work-sync:line-meta:${created.id}`), draftMeta); persistedNote.current = { id: created.id, body: created.body }; setSaved((prev) => [created, ...prev]); setActiveId(created.id); if (activeProjectId !== "all" && activeProjectId !== "unassigned") setNoteProjects((current) => ({ ...current, [created.id]: activeProjectId })); }
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
      setNoteProjects((current) => { const next = { ...current }; delete next[activeId]; return next; });
      newNote();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function createProject() {
    const title = window.prompt("Name this project")?.trim();
    if (!title) return;
    const project = { id: crypto.randomUUID(), title: title.slice(0, 80) };
    setProjects((current) => [...current, project]);
    setActiveProjectId(project.id);
    // A project starts with a fresh note so there is an immediate place to work.
    newNote();
  }
  function assignCurrentNote(projectId: string) {
    if (!activeId) return;
    setNoteProjects((current) => { const next = { ...current }; if (projectId) next[activeId] = projectId; else delete next[activeId]; return next; });
    setNoteMenuOpen(false);
  }

  function exportCsv() {
    const name = safeFileName(saved.find((note) => note.id === activeId)?.title ?? body.split("\n")[0] ?? "workspace-note");
    downloadFile(new Blob([`title,body\n${csvCell(name)},${csvCell(body)}\n`], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
    setNoteMenuOpen(false);
  }

  async function exportDocx() {
    const name = safeFileName(saved.find((note) => note.id === activeId)?.title ?? body.split("\n")[0] ?? "workspace-note");
    try { downloadFile(await createDocx(body), `${name}.docx`); } catch (e) { setError(e instanceof Error ? e.message : "Unable to export this Word document."); }
    setNoteMenuOpen(false);
  }

  async function importNoteFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setBusy(true); setError(null);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const imported = extension === "docx" ? await docxAsWorkspaceText(file) : extension === "csv" ? csvAsWorkspaceText(await file.text(), file.name.replace(/\.csv$/i, "") || "Imported CSV") : await file.text();
      if (!imported.trim()) throw new Error("This file did not contain any readable text.");
      persistedNote.current = { id: null, body: "" }; setActiveId(null); setBody(imported); setNoteMenuOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to import that file."); }
    finally { setBusy(false); }
  }

  return (
    <Workspace
      title="Workspace"
      subtitle="Open field · saved notes"
      actions={
        <div className="ms-row">
          <div className="ms-workspace-note-actions" data-workspace-note-actions>
            <label className="ms-workspace-project-picker">
              <span>Projects</span>
              <select aria-label="Select Workspace project" value={activeProjectId} onChange={(event) => { if (event.target.value === "new") createProject(); else setActiveProjectId(event.target.value); }}>
                <option value="all">All notes</option><option value="unassigned">Unassigned</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}<option value="new">New project…</option>
              </select>
            </label>
            <label className="ms-workspace-note-picker">
            <span>Notes</span>
            <select aria-label="Select Workspace note" value={activeId ?? ""} onChange={(event) => { const note = saved.find((item) => item.id === event.target.value); if (note) openNote(note); else newNote(); }}>
              <option value="">New note</option>
              {visibleSaved.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
            </select>
            </label>
            <button type="button" className="ms-workspace-note-more" aria-label="Workspace note options" aria-haspopup="menu" aria-expanded={noteMenuOpen} onClick={() => setNoteMenuOpen((open) => !open)}>⋯</button>
            {noteMenuOpen && <div className="ms-workspace-note-menu" role="menu"><button type="button" className="ms-workspace-menu-new" onClick={() => { newNote(); setNoteMenuOpen(false); }} disabled={busy}>New</button><button type="button" onClick={() => { void saveCurrentNote(); setNoteMenuOpen(false); }} disabled={busy || !body.trim()}>Save to cloud</button><label className="ms-workspace-project-assignment">Add to project<select aria-label="Add current note to project" value={activeId ? noteProjects[activeId] ?? "" : ""} onChange={(event) => assignCurrentNote(event.target.value)} disabled={!activeId}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><button type="button" onClick={() => { setNoteMenuOpen(false); window.requestAnimationFrame(() => importInput.current?.click()); }} disabled={busy}>Import CSV or Word…</button><button type="button" onClick={exportCsv} disabled={!body.trim()}>Export CSV</button><button type="button" onClick={() => { void exportDocx(); }} disabled={!body.trim()}>Export Word (.docx)</button><button type="button" className="is-danger" onClick={() => { void deleteNote(); setNoteMenuOpen(false); }} disabled={busy || !activeId}>Delete</button></div>}
          </div>
          <button type="button" className="ms-btn ms-workspace-new" onClick={newNote} disabled={busy}>
            New
          </button>
          <span className="ms-muted ms-workspace-save-status">{busy ? "Saving…" : "Saved to cloud"}</span>
        </div>
      }
    >
      {error ? <p className="ms-sev-critical">{error}</p> : null}
      <input ref={importInput} className="ms-visually-hidden" type="file" accept=".csv,.docx,.txt,.md,text/csv,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { void importNoteFile(event); }} />
      <div className="ms-notes-layout">
        <div className="ms-panel ms-notes-field">
          <LineEditor value={body} onChange={setBody} storageKey={activeId ?? "draft"} />
        </div>
      </div>
    </Workspace>
  );
}
