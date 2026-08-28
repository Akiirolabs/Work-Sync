"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { AO_MACRO_CATALOG, AO_MACRO_CATEGORIES, type AOMacroDefinition, type AOMacroField } from "@/lib/ao-catalog";
import {
  AO_MACROS_KEY, AO_TABLE_COMMAND_EVENT, AO_TABLE_COMMAND_KEY, AO_WORKSPACE_OPEN_EVENT,
  AO_WORKSPACE_OPEN_KEY, AO_WORKSPACE_TEXT_EVENT, AO_WORKSPACE_TEXT_KEY,
  type AOMacroPreset, type AOTableCommand,
} from "@/lib/ao-macro";
import { decodePageCell, type WorkTable } from "@/lib/table-model";
import styles from "./AOMacroMenu.module.css";

type View = "main" | "macro" | "route" | "turbo" | "vault" | "preferences";
type Note = { id: string; title: string; body: string; createdAt: string; updatedAt: string };
type Option = { value: string; label: string };
const DRAFT_KEY = "work-sync:workspace-draft";
const TABLES_KEY = "work-sync:tables";

const ROUTES = [["Workspace", "/", "⌂"], ["Tables", "/tables", "▦"], ["Sources", "/sources", "S"], ["Verify", "/verify", "✓"], ["History", "/history", "H"], ["Connect", "/connect", "C"]] as const;
const WORKSPACE_TEMPLATES: Record<string, string> = {
  meeting: "## Attendees\n\n## Agenda\n\n## Decisions\n\n## Follow-up",
  project: "## Objective\n\n## Owner\n\n## Milestones\n\n## Risks\n\n## Next actions",
};

function AOLogo() { return <span className={styles.logo} aria-hidden><svg viewBox="0 0 32 32" focusable="false"><path d="M3.75 22.5 9.25 8.75l5.5 13.75M5.9 17h6.7" /><rect x="18" y="8.75" width="10" height="13.75" rx="5" /></svg></span>; }
function VaultIcon() { return <span className={styles.vaultIcon} aria-hidden><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="9" ry="3.5" /><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)" /></svg></span>; }

export function AOMacroMenu() {
  const router = useRouter(); const pathname = usePathname(); const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); const [view, setView] = useState<View>("main");
  const [turboText, setTurboText] = useState(""); const [presets, setPresets] = useState<AOMacroPreset[]>([]);
  const [tables, setTables] = useState<WorkTable[]>([]); const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("Workspace");
  const [selected, setSelected] = useState<AOMacroDefinition | null>(null); const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [vaultQuery, setVaultQuery] = useState("");
  const [vaultRecent, setVaultRecent] = useState(false);

  function readLocalData() {
    try { const parsed = JSON.parse(localStorage.getItem(AO_MACROS_KEY) ?? "[]") as AOMacroPreset[]; setPresets(Array.isArray(parsed) ? parsed : []); } catch { setPresets([]); }
    try { const parsed = JSON.parse(localStorage.getItem(TABLES_KEY) ?? "[]") as WorkTable[]; setTables(Array.isArray(parsed) ? parsed : []); } catch { setTables([]); }
  }
  useEffect(readLocalData, []);
  useEffect(() => {
    function dismiss(event: PointerEvent) { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { if (selected) setSelected(null); else setOpen(false); } }
    document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [selected]);

  async function refreshNotes() { try { setNotes(await api<Note[]>("/api/v1/notes")); } catch { setNotes([]); } }
  function showView(next: View) { readLocalData(); setView(next); setSelected(null); setError(""); setNotice(""); if (next === "vault") setVaultRecent(false); if (next === "macro" || next === "vault") void refreshNotes(); }
  function close() { setOpen(false); setView("main"); setSelected(null); setError(""); }
  function savePresets(next: AOMacroPreset[]) { setPresets(next); localStorage.setItem(AO_MACROS_KEY, JSON.stringify(next)); }
  function presetById(presetId?: string) { return presets.find((item) => item.id === presetId); }
  function touchPreset(presetId: string) { const next = presets.map((item) => item.id === presetId ? { ...item, lastUsedAt: new Date().toISOString() } : item); savePresets(next); return next.find((item) => item.id === presetId); }

  function sendTableCommand(command: AOTableCommand) {
    localStorage.setItem(AO_TABLE_COMMAND_KEY, JSON.stringify(command));
    if (pathname === "/tables") window.dispatchEvent(new Event(AO_TABLE_COMMAND_EVENT)); else router.push("/tables");
    close();
  }
  function sendWorkspaceText(text: string) {
    const value = text.trim(); if (!value) return;
    localStorage.setItem(AO_WORKSPACE_TEXT_KEY, value);
    if (pathname === "/") window.dispatchEvent(new Event(AO_WORKSPACE_TEXT_EVENT)); else router.push("/");
    close();
  }
  function openWorkspaceNote(note: Note) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ body: note.body, activeId: note.id }));
    localStorage.setItem(AO_WORKSPACE_OPEN_KEY, JSON.stringify({ id: note.id, body: note.body }));
    if (pathname === "/") window.dispatchEvent(new Event(AO_WORKSPACE_OPEN_EVENT)); else router.push("/");
    close();
  }
  async function createWorkspaceNote(title: string, content = "") {
    const cleanTitle = title.trim() || "Untitled note"; const body = content.trim() ? `${cleanTitle}\n${content.trim()}` : cleanTitle;
    const note = await api<Note>("/api/v1/notes", { method: "POST", body: JSON.stringify({ title: cleanTitle, body }) }); openWorkspaceNote(note);
  }
  function currentDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as { body?: string; activeId?: string | null }; } catch { return {}; } }
  async function updateCurrent(transform: (body: string) => string) {
    const draft = currentDraft(); const body = transform(draft.body ?? "");
    if (draft.activeId) { const note = await api<Note>(`/api/v1/notes/${draft.activeId}`, { method: "PATCH", body: JSON.stringify({ body }) }); openWorkspaceNote(note); }
    else await createWorkspaceNote(body.split("\n")[0] || "Untitled note", body.split("\n").slice(1).join("\n"));
  }

  const selectedTable = useMemo(() => { const pageTableId = values.page?.split(":")[0]; return tables.find((item) => item.id === (values.tableId || pageTableId)) ?? tables[0]; }, [tables, values.page, values.tableId]);
  function optionsFor(field: AOMacroField): Option[] {
    if (field.type === "table") return tables.map((item) => ({ value: item.id, label: item.name }));
    if (field.type === "column") return (selectedTable?.columns ?? []).filter((item) => selected?.action === "column-show" ? item.hidden : selected?.action === "column-hide" ? !item.hidden : true).map((item) => ({ value: item.id, label: `${item.name} · ${item.type}` }));
    if (field.type === "column-type") return ([ ["text", "Text"], ["number", "Number"], ["percent", "Percent"], ["currency", "Currency"], ["single", "Single Select"], ["multiple", "Multiple Select"], ["date", "Date"], ["people", "People"], ["files", "Image & Files"], ["checkbox", "Checkbox"], ["reaction", "Reaction"], ["formula", "Formula"], ["relation", "Relation"], ["rollup", "Rollup"], ["page", "Page"], ["url", "URL"], ["phone", "Phone"], ["email", "Email"] ] as Array<[string, string]>).map(([value, label]) => ({ value, label }));
    if (field.type === "page-column") return [...(selectedTable?.columns ?? []).filter((item) => item.type === "page").map((item) => ({ value: item.id, label: item.name })), { value: "__new_page__", label: "＋ Create Page column" }];
    if (field.type === "row") return (selectedTable?.rows ?? []).map((item, index) => ({ value: item.id, label: String(item.cells[selectedTable!.columns[0]!.id] || `Row ${index + 1}`) }));
    if (field.type === "preset") return [...presets].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))).map((item) => ({ value: item.id, label: item.label }));
    if (field.type === "destination") return [{ value: "new-note", label: "New Workspace note" }, { value: "current-note", label: "Current Workspace note" }, { value: "new-table", label: "New table" }, { value: "page", label: "Table page" }];
    if (field.type === "page") return tables.flatMap((table) => table.columns.filter((column) => column.type === "page").flatMap((column) => table.rows.flatMap((row, index) => { const document = decodePageCell(row.cells[column.id]); return document.title || document.body ? [{ value: `${table.id}:${row.id}:${column.id}`, label: `${document.title || "Untitled"} · ${table.name} / ${column.name} / Row ${index + 1}` }] : []; })));
    return [];
  }
  function beginMacro(macro: AOMacroDefinition, overrides: Record<string, string> = {}) {
    const initial: Record<string, string> = {};
    for (const field of macro.fields ?? []) { const options = optionsFor(field); if (options[0]) initial[field.key] = options[0].value; if (field.type === "number") initial[field.key] = "3"; if (field.type === "destination") initial[field.key] = "new-note"; }
    setValues({ ...initial, ...overrides }); setSelected(macro); setError(""); setNotice("");
  }
  function valueFor(key: string) { return values[key]?.trim() ?? ""; }
  function requiredReady() { return (selected?.fields ?? []).every((field) => field.optional || Boolean(valueFor(field.key))); }

  async function runWorkspace(macro: AOMacroDefinition) {
    const chosenPreset = presetById(valueFor("presetId"));
    if (macro.action === "workspace-new") return createWorkspaceNote(valueFor("title"));
    if (macro.action === "workspace-new-preset") { if (!chosenPreset) throw new Error("Choose a saved text preset."); touchPreset(chosenPreset.id); return createWorkspaceNote(valueFor("title"), chosenPreset.text); }
    if (macro.action === "workspace-template") return createWorkspaceNote(valueFor("title"), WORKSPACE_TEMPLATES[macro.value ?? ""] ?? "");
    if (macro.action === "workspace-open") { const found = notes.find((item) => item.title.toLowerCase() === valueFor("noteId").toLowerCase()) ?? notes.find((item) => item.title.toLowerCase().includes(valueFor("noteId").toLowerCase())); if (!found) throw new Error("No saved note matches that title."); return openWorkspaceNote(found); }
    if (macro.action === "workspace-duplicate") { const draft = currentDraft(); return createWorkspaceNote(valueFor("title"), draft.body ?? ""); }
    if (macro.action === "workspace-append") { if (!chosenPreset) throw new Error("Choose a saved text preset."); touchPreset(chosenPreset.id); return updateCurrent((body) => body.trim() ? `${body.trimEnd()}\n${chosenPreset.text}` : chosenPreset.text); }
    if (macro.action === "workspace-prepend") { if (!chosenPreset) throw new Error("Choose a saved text preset."); touchPreset(chosenPreset.id); return updateCurrent((body) => body.trim() ? `${chosenPreset.text}\n${body.trimStart()}` : chosenPreset.text); }
    if (macro.action === "workspace-section") return updateCurrent((body) => `${body.trimEnd()}\n\n## ${valueFor("title")} · ${new Date().toLocaleDateString()}`.trim());
    if (macro.action === "workspace-save-new") { const draft = currentDraft(); if (!draft.activeId && draft.body?.trim()) await api<Note>("/api/v1/notes", { method: "POST", body: JSON.stringify({ body: draft.body }) }); return createWorkspaceNote(valueFor("title")); }
  }

  async function runVault(macro: AOMacroDefinition) {
    const chosen = presetById(valueFor("presetId")); const now = new Date().toISOString();
    if (macro.action === "vault-create") { savePresets([...presets, { id: crypto.randomUUID(), label: valueFor("name"), text: valueFor("text"), createdAt: now }]); setSelected(null); setNotice("Text preset saved to Vault."); return; }
    if (macro.action === "vault-find" || macro.action === "vault-recent") { setVaultRecent(macro.action === "vault-recent"); setView("vault"); setSelected(null); return; }
    if (!chosen) throw new Error("Choose a saved macro.");
    if (macro.action === "vault-pin") savePresets(presets.map((item) => item.id === chosen.id ? { ...item, pinned: !item.pinned } : item));
    if (macro.action === "vault-duplicate") savePresets([...presets, { ...chosen, id: crypto.randomUUID(), label: valueFor("name"), pinned: false, createdAt: now }]);
    if (macro.action === "vault-rename") savePresets(presets.map((item) => item.id === chosen.id ? { ...item, label: valueFor("name") } : item));
    if (macro.action === "vault-edit") savePresets(presets.map((item) => item.id === chosen.id ? { ...item, text: valueFor("text") } : item));
    if (macro.action === "vault-delete") savePresets(presets.filter((item) => item.id !== chosen.id));
    if (macro.action === "vault-run") { touchPreset(chosen.id); const destination = valueFor("destination"); if (destination === "new-note") await createWorkspaceNote(chosen.label, chosen.text); else if (destination === "current-note") sendWorkspaceText(chosen.text); else if (destination === "new-table") sendTableCommand({ action: "add-table", text: chosen.text }); else { if (!valueFor("page")) throw new Error("Choose a destination page."); sendTableCommand({ action: "page-append", page: valueFor("page"), text: chosen.text }); } return; }
    setSelected(null); setNotice("Vault updated.");
  }

  async function runSelected() {
    if (!selected || !requiredReady()) return; setBusy(true); setError("");
    try {
      if (selected.category === "Workspace") await runWorkspace(selected);
      else if (selected.category === "Vault") await runVault(selected);
      else { const chosen = presetById(valueFor("presetId")); if (chosen) touchPreset(chosen.id); sendTableCommand({ action: selected.action, tableId: valueFor("tableId"), columnId: valueFor("columnId"), rowId: valueFor("rowId"), destinationRowId: valueFor("destinationRowId"), name: valueFor("name"), title: valueFor("title"), text: chosen?.text ?? valueFor("text"), type: selected.value ?? valueFor("type"), template: selected.value, query: valueFor("query"), count: Number(valueFor("count")) || undefined, page: valueFor("page") }); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Macro failed."); } finally { setBusy(false); }
  }

  const filteredMacros = AO_MACRO_CATALOG.filter((item) => (!category || item.category === category) && (!query || `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase())));
  const vaultItems = [...presets].filter((item) => (!vaultRecent || item.lastUsedAt) && (!vaultQuery || `${item.label} ${item.text}`.toLowerCase().includes(vaultQuery.toLowerCase()))).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.lastUsedAt ?? b.createdAt ?? "").localeCompare(a.lastUsedAt ?? a.createdAt ?? ""));
  const titles: Record<View, string> = { main: "Macro Key Menu", macro: selected?.label ?? "Macro", route: "Route", turbo: "Turbo", vault: "Vault", preferences: "Preferences" };

  return <div className={styles.root} ref={rootRef}>
    {open && <section className={styles.panel} role="dialog" aria-label="AO macro key menu">
      <header className={styles.header}>{view === "main" ? <AOLogo /> : <button type="button" className={styles.back} aria-label="Back" onClick={() => { if (selected) setSelected(null); else setView("main"); }}>←</button>}<div><strong>{titles[view]}</strong><small>AO · Akiiro Operator</small></div><button type="button" className={styles.close} aria-label="Close AO macro key menu" onClick={close}>×</button></header>
      {view === "main" && <div className={styles.list}>
        <button type="button" onClick={() => showView("macro")}><span className={styles.infoMark} tabIndex={0} aria-label="Macro information" data-tip="Search, configure and run more than 70 app shortcuts.">i</span><b>Macro</b><em>›</em></button>
        <button type="button" onClick={() => showView("route")}><span className={styles.infoMark} tabIndex={0} aria-label="Route information" data-tip="Jump directly to a destination in Work Sync.">i</span><b>Route</b><em>›</em></button>
        <button type="button" onClick={() => showView("turbo")}><span className={styles.infoMark} tabIndex={0} aria-label="Turbo information" data-tip="Send written input to Workspace or a new table.">i</span><b>Turbo</b><em>›</em></button>
        <button type="button" onClick={() => showView("vault")}><VaultIcon /><b>Vault</b><span className={styles.infoMark} tabIndex={0} aria-label="Vault information" data-tip="See, run and manage all saved macros at a glance.">i</span></button>
        <hr /><button type="button" onClick={() => showView("preferences")}><span>⚙</span><b>Preferences</b><em>›</em></button>
      </div>}
      {view === "macro" && !selected && <div className={styles.macroBrowser}>
        <label className={styles.search}><span>⌕</span><input aria-label="Search macros" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${AO_MACRO_CATALOG.length} presets…`} /></label>
        <div className={styles.categories}>{AO_MACRO_CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? styles.active : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
        {notice && <p className={styles.notice}>{notice}</p>}<div className={styles.macroResults}>{filteredMacros.map((macro) => <button type="button" key={macro.id} onClick={() => beginMacro(macro)}><span>{macro.label}</span><small>{macro.description}</small><em>›</em></button>)}</div>
      </div>}
      {view === "macro" && selected && <form className={styles.runner} onSubmit={(event) => { event.preventDefault(); void runSelected(); }}><p>{selected.description}</p>{(selected.fields ?? []).map((field) => { const options = optionsFor(field); const isSelect = options.length || ["table", "column", "column-type", "row", "page-column", "page", "preset", "destination"].includes(field.type); return <label key={`${field.key}-${field.type}`}>{field.label}{isSelect ? <select value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value, ...(field.type === "table" ? { columnId: "", rowId: "" } : {}) }))}><option value="">Choose…</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "textarea" ? <textarea value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} /> : <input type={field.type === "number" ? "number" : "text"} min={field.type === "number" ? 1 : undefined} max={field.type === "number" ? 100 : undefined} value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} />}</label>; })}{selected.action === "vault-run" && valueFor("destination") === "page" && <label>Page<select value={values.page ?? ""} onChange={(event) => setValues((current) => ({ ...current, page: event.target.value }))}><option value="">Choose…</option>{optionsFor({ key: "page", label: "Page", type: "page" }).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}{error && <p className={styles.error}>{error}</p>}<button type="submit" disabled={busy || !requiredReady()}>{busy ? "Running…" : selected.action === "vault-delete" ? "Confirm delete" : "Run macro"}</button></form>}
      {view === "route" && <div className={styles.list}><p className={styles.hint}>Open a destination in this app.</p>{ROUTES.map(([label, href, icon]) => <button type="button" key={href} className={pathname === href ? styles.active : ""} onClick={() => { router.push(href); close(); }}><span>{icon}</span><b>{label}</b>{pathname === href && <em>Current</em>}</button>)}</div>}
      {view === "turbo" && <form className={styles.form} onSubmit={(event) => { event.preventDefault(); sendWorkspaceText(turboText); }}><label>Input prompt<textarea value={turboText} onChange={(event) => setTurboText(event.target.value)} placeholder="Write content for a destination…" autoFocus /></label><div className={styles.actions}><button type="submit" disabled={!turboText.trim()}>Write in Workspace</button><button type="button" disabled={!turboText.trim()} onClick={() => sendTableCommand({ action: "add-table", text: turboText })}>Make a new table</button></div></form>}
      {view === "vault" && <div className={styles.vault}><label className={styles.search}><span>⌕</span><input aria-label="Search Vault" value={vaultQuery} onChange={(event) => setVaultQuery(event.target.value)} placeholder="Search saved macros…" /></label>{vaultRecent && <p className={styles.notice}>Recently used macros</p>}<button type="button" className={styles.createPreset} onClick={() => { setView("macro"); beginMacro(AO_MACRO_CATALOG.find((item) => item.id === "vault-create")!); }}>＋ Create text preset</button>{vaultItems.length ? vaultItems.map((preset) => <div key={preset.id}><span>{preset.pinned ? "◇" : ""}</span><button type="button" onClick={() => { setView("macro"); beginMacro(AO_MACRO_CATALOG.find((item) => item.id === "vault-run")!, { presetId: preset.id }); }}><strong>{preset.label}</strong><small>{preset.text}</small></button><button type="button" aria-label={`Pin ${preset.label}`} onClick={() => savePresets(presets.map((item) => item.id === preset.id ? { ...item, pinned: !item.pinned } : item))}>⌃</button></div>) : <p className={styles.empty}>{vaultRecent ? "No recently used macros." : "No saved macros yet."}</p>}</div>}
      {view === "preferences" && <div className={styles.preferences}><p className={styles.hint}>Text presets are now created, searched and run inside Macro and Vault.</p><button type="button" className={styles.save} onClick={() => showView("vault")}>Open Vault</button></div>}
    </section>}
    <button type="button" className={styles.trigger} aria-label="Open AO macro key menu" aria-expanded={open} onClick={() => { setOpen((current) => !current); if (open) setView("main"); }}><AOLogo /></button>
  </div>;
}
