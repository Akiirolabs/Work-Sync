"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/client-api";
import { AO_MACRO_CATALOG, AO_MACRO_CATEGORIES, type AOMacroDefinition, type AOMacroField } from "@/lib/ao-catalog";
import {
  AO_MACROS_KEY, AO_MACROS_CHANGED_EVENT, AO_OPEN_MACRO_MENU_EVENT, AO_OPEN_VAULT_EVENT, AO_RUN_MAIN_MACRO_EVENT, AO_TABLE_COMMAND_EVENT, AO_TABLE_COMMAND_KEY, AO_WORKSPACE_OPEN_EVENT,
  AO_WORKSPACE_OPEN_KEY, AO_WORKSPACE_PROJECTS_EVENT, AO_WORKSPACE_TEXT_EVENT, AO_WORKSPACE_TEXT_KEY, AO_WORKSPACE_LINE_COMMAND_EVENT, AO_WORKSPACE_LINE_COMMAND_KEY,
  type AOCustomMacroStep, type AOMacroPreset, type AOTableCommand, type AOWorkspaceLineCommand,
} from "@/lib/ao-macro";
import { decodePageCell, type WorkTable } from "@/lib/table-model";
import { AO_TODO_COMMAND_EVENT, AO_TODO_COMMAND_KEY, TODO_LIST_STORAGE_KEY, TODO_STORAGE_EVENT, TODO_STORAGE_KEY, type AOTodoCommand, type TodoItem, type TodoList } from "@/lib/todo-model";
import { userStorageKey } from "@/lib/user-storage";
import { MACRO_ICON_OPTIONS, MacroIcon, macroIconFor, type MacroIconName } from "./MacroIcon";
import styles from "./AOMacroMenu.module.css";

type View = "main" | "macro" | "route" | "turbo" | "vault" | "preferences";
type Note = { id: string; title: string; body: string; createdAt: string; updatedAt: string };
type Option = { value: string; label: string };
type WorkspaceProject = { id: string; title: string; createdAt?: string };
type DayDocument = { id: string; name: string; day: string; body: string; taskId?: string; updatedAt: string };
type Finding = { id: string; name: string; result: { note: { title: string }; summary: string; method: string[]; confirmed: Array<{ assertion: string; status: string; explanation: string }>; evidence: Array<{ title: string; url: string; publisher: string; relevance: string }>; uncertainty: string[]; trustScore: number; trustRationale: string; answer: string }; messages?: Array<{ role: string; content: string }>; updatedAt: string };
type SourceResult = { id: string; name: string; noteId: string; noteTitle: string; request: string; sources: Array<{ title: string; url: string; publisher: string; summary: string; trustReason: string }>; updatedAt: string };
type MacroMode = "home" | "presets" | "builder";
type BuilderStep = AOCustomMacroStep & { id: string };
const DRAFT_KEY = "work-sync:workspace-draft";
const TABLES_KEY = "work-sync:tables";
const PROJECTS_KEY = "work-sync:workspace-projects";
const NOTE_PROJECTS_KEY = "work-sync:workspace-note-projects";
const DAY_DOCUMENTS_KEY = "work-sync:timeline-day-docs";
const FINDINGS_KEY = "work-sync:verify-findings";
const SOURCE_RESULTS_KEY = "work-sync:source-results";
const VERIFY_PREFILL_KEY = "work-sync:verify-prefill";
const VERIFY_OPEN_FINDING_KEY = "work-sync:verify-open-finding";
const SOURCES_OPEN_RESULT_KEY = "work-sync:sources-open-result";
const TIMELINE_OPEN_DOCUMENT_KEY = "work-sync:timeline-open-document";
const MAIN_MACRO_LIMIT = 6;

const ROUTES: ReadonlyArray<{ label: string; href: string; icon: MacroIconName }> = [{ label: "Workspace", href: "/", icon: "document" }, { label: "To Do", href: "/todo", icon: "todo" }, { label: "Tables", href: "/tables", icon: "table" }, { label: "Sources", href: "/sources", icon: "sources" }, { label: "Verify", href: "/verify", icon: "verify" }, { label: "Calendar", href: "/history", icon: "calendar" }, { label: "Connect", href: "/connect", icon: "computer" }];
const VAULT_CATEGORIES = ["All", "Workspace", "To Do", "Tables", "Rows", "Columns", "Pages", "Custom"] as const;
const WORKSPACE_TEMPLATES: Record<string, string> = {
  meeting: "| Attendees | Agenda | Decisions | Follow-Up |\n| --- | --- | --- | --- |\n|  |  |  |  |",
  project: "| Objective | Owner | Milestones | Risks | Next Action |\n| --- | --- | --- | --- | --- |\n|  |  |  |  |  |",
};

function AOLogo() { return <span className={styles.logo} aria-hidden><svg viewBox="0 0 32 32" focusable="false"><path d="M3.75 22.5 9.25 8.75l5.5 13.75M5.9 17h6.7" /><rect x="18" y="8.75" width="10" height="13.75" rx="5" /></svg></span>; }
function VaultIcon({ info = false }: { info?: boolean }) { return <span className={`${styles.vaultIcon}${info ? ` ${styles.vaultInfo}` : ""}`} tabIndex={info ? 0 : undefined} aria-label={info ? "Vault information" : undefined} data-tip={info ? "See, run and manage all saved text and custom macros." : undefined} aria-hidden={info ? undefined : true}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="9" ry="3.5" /><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)" /></svg></span>; }
function PreferencesGear() { return <svg className={styles.preferencesGear} viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94a7.3 7.3 0 0 0 .05-.94 7.3 7.3 0 0 0-.05-.94l2.03-1.58-1.92-3.32-2.39.96a6.9 6.9 0 0 0-1.63-.94L14.87 3h-3.84l-.36 2.18a6.9 6.9 0 0 0-1.63.94l-2.39-.96-1.92 3.32 2.03 1.58a7.3 7.3 0 0 0-.05.94c0 .32.02.63.05.94l-2.03 1.58 1.92 3.32 2.39-.96c.5.4 1.05.72 1.63.94l.36 2.18h3.84l.36-2.18c.58-.22 1.13-.54 1.63-.94l2.39.96 1.92-3.32-2.03-1.58ZM12 15.25A3.25 3.25 0 1 1 12 8.75a3.25 3.25 0 0 1 0 6.5Z" /></svg>; }

export function AOMacroMenu() {
  const router = useRouter(); const pathname = usePathname(); const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); const [view, setView] = useState<View>("main");
  const [turboText, setTurboText] = useState(""); const [presets, setPresets] = useState<AOMacroPreset[]>([]);
  const [tables, setTables] = useState<WorkTable[]>([]); const [notes, setNotes] = useState<Note[]>([]); const [todos, setTodos] = useState<TodoItem[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]); const [findings, setFindings] = useState<Finding[]>([]); const [sourceResults, setSourceResults] = useState<SourceResult[]>([]); const [dayDocuments, setDayDocuments] = useState<DayDocument[]>([]);
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("Workspace");
  const [selected, setSelected] = useState<AOMacroDefinition | null>(null); const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [vaultQuery, setVaultQuery] = useState("");
  const [vaultCategory, setVaultCategory] = useState<(typeof VAULT_CATEGORIES)[number]>("All");
  const [vaultRecent, setVaultRecent] = useState(false);
  const [vaultTextOnly, setVaultTextOnly] = useState(false);
  const [macroMode, setMacroMode] = useState<MacroMode>("home");
  const [builderName, setBuilderName] = useState("");
  const [builderChoice, setBuilderChoice] = useState(AO_MACRO_CATALOG[0]!.id);
  const [builderSteps, setBuilderSteps] = useState<BuilderStep[]>([]);
  const [customToRun, setCustomToRun] = useState<AOMacroPreset | null>(null);
  const [vaultMenu, setVaultMenu] = useState<{ id: string; left: number; top: number } | null>(null);
  const [mainTooltip, setMainTooltip] = useState<{ label: string; left: number; top: number } | null>(null);

  function readLocalData() {
    try { const parsed = JSON.parse(localStorage.getItem(userStorageKey(AO_MACROS_KEY)) ?? "[]") as AOMacroPreset[]; setPresets(Array.isArray(parsed) ? parsed.map((item) => item.main ? item : { ...item, icon: undefined }) : []); } catch { setPresets([]); }
    try { const parsed = JSON.parse(localStorage.getItem(userStorageKey(TABLES_KEY)) ?? "[]") as WorkTable[]; setTables(Array.isArray(parsed) ? parsed : []); } catch { setTables([]); }
    try { const parsed = JSON.parse(localStorage.getItem(userStorageKey(TODO_STORAGE_KEY)) ?? "[]") as TodoItem[]; setTodos(Array.isArray(parsed) ? parsed : []); } catch { setTodos([]); }
    try { const parsed = JSON.parse(localStorage.getItem(userStorageKey(PROJECTS_KEY)) ?? "[]") as WorkspaceProject[]; setProjects(Array.isArray(parsed) ? parsed : []); } catch { setProjects([]); }
    try { const parsed = JSON.parse(localStorage.getItem(userStorageKey(FINDINGS_KEY)) ?? "[]") as Finding[]; setFindings(Array.isArray(parsed) ? parsed : []); } catch { setFindings([]); }
    try { const parsed = JSON.parse(localStorage.getItem(userStorageKey(SOURCE_RESULTS_KEY)) ?? "[]") as SourceResult[]; setSourceResults(Array.isArray(parsed) ? parsed : []); } catch { setSourceResults([]); }
    try { const parsed = JSON.parse(localStorage.getItem(userStorageKey(DAY_DOCUMENTS_KEY)) ?? "[]") as DayDocument[]; setDayDocuments(Array.isArray(parsed) ? parsed : []); } catch { setDayDocuments([]); }
  }
  useEffect(readLocalData, []);
  useEffect(() => {
    function openMenu() { readLocalData(); setOpen(true); setView("macro"); setMacroMode("home"); }
    function openVault() { readLocalData(); setOpen(true); setView("vault"); setVaultRecent(false); setVaultCategory("All"); setVaultTextOnly(false); }
    function runMain(event: Event) {
      const presetId = (event as CustomEvent<{ presetId?: string }>).detail?.presetId;
      try {
        const saved = JSON.parse(localStorage.getItem(userStorageKey(AO_MACROS_KEY)) ?? "[]") as AOMacroPreset[];
        const preset = saved.find((item) => item.id === presetId);
        if (preset) { setPresets(saved); setOpen(true); launchPreset(preset); }
      } catch { /* ignore malformed saved macros */ }
    }
    window.addEventListener(AO_OPEN_MACRO_MENU_EVENT, openMenu);
    window.addEventListener(AO_OPEN_VAULT_EVENT, openVault);
    window.addEventListener(AO_RUN_MAIN_MACRO_EVENT, runMain);
    return () => { window.removeEventListener(AO_OPEN_MACRO_MENU_EVENT, openMenu); window.removeEventListener(AO_OPEN_VAULT_EVENT, openVault); window.removeEventListener(AO_RUN_MAIN_MACRO_EVENT, runMain); };
  });
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest("[data-vault-actions]")) return;
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
      if (!(event.target instanceof Element && event.target.closest("[data-vault-chevron]"))) setVaultMenu(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (vaultMenu) { setVaultMenu(null); }
      else if (selected) setSelected(null);
      else if (customToRun) setCustomToRun(null);
      else if (view === "macro" && macroMode !== "home") setMacroMode("home");
      else setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [customToRun, macroMode, selected, vaultMenu, view]);

  async function refreshNotes() { try { setNotes(await api<Note[]>("/api/v1/notes")); } catch { setNotes([]); } }
  function showView(next: View) { readLocalData(); setView(next); setSelected(null); setCustomToRun(null); setVaultMenu(null); setMainTooltip(null); setError(""); setNotice(""); if (next === "macro") setMacroMode("home"); if (next === "vault") { setVaultRecent(false); setVaultCategory("All"); setVaultTextOnly(false); } if (next === "macro" || next === "vault") void refreshNotes(); }
  function close() { setOpen(false); setView("main"); setSelected(null); setCustomToRun(null); setVaultMenu(null); setMainTooltip(null); setError(""); }
  function showMainTooltip(button: HTMLButtonElement, label: string) { const rect = button.getBoundingClientRect(); const width = Math.min(190, Math.max(72, label.length * 6 + 16)); setMainTooltip({ label, left: Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8)), top: Math.max(8, rect.top - 31) }); }
  function savePresets(next: AOMacroPreset[]) { setPresets(next); localStorage.setItem(userStorageKey(AO_MACROS_KEY), JSON.stringify(next)); window.dispatchEvent(new Event(AO_MACROS_CHANGED_EVENT)); }
  function presetById(presetId?: string) { return presets.find((item) => item.id === presetId); }
  function touchPreset(presetId: string) { const next = presets.map((item) => item.id === presetId ? { ...item, lastUsedAt: new Date().toISOString() } : item); savePresets(next); return next.find((item) => item.id === presetId); }
  function isTextPreset(preset: AOMacroPreset) { return !preset.macroId && !preset.steps?.length; }
  function launchPreset(preset: AOMacroPreset) {
    setVaultMenu(null);
    if (preset.steps?.length) { setView("vault"); setCustomToRun(preset); }
    else if (preset.macroId) { const macro = AO_MACRO_CATALOG.find((item) => item.id === preset.macroId); if (macro) { setView("macro"); setMacroMode("home"); beginMacro(macro); } }
    else { setView("macro"); setMacroMode("home"); beginMacro(AO_MACRO_CATALOG.find((item) => item.id === "vault-run")!, { presetId: preset.id }); }
  }
  function toggleMainPreset(preset: AOMacroPreset) {
    const currentMain = presets.filter((item) => item.main);
    if (!preset.main && currentMain.length >= MAIN_MACRO_LIMIT) { setNotice(`Main Macro is limited to ${MAIN_MACRO_LIMIT} shortcuts.`); setVaultMenu(null); return; }
    if (!preset.main) { const nextOrder = currentMain.reduce((highest, item) => Math.max(highest, item.mainOrder ?? 0), -1) + 1; savePresets(presets.map((item) => item.id === preset.id ? { ...item, main: true, mainOrder: nextOrder, icon: undefined } : item)); setNotice(`${preset.label} added to Main Macro. Choose its icon below.`); return; }
    savePresets(presets.map((item) => item.id === preset.id ? { ...item, main: false, mainOrder: undefined, icon: undefined } : item));
    setNotice(`${preset.label} removed from Main Macro.`); setVaultMenu(null);
  }
  function setPresetIcon(preset: AOMacroPreset, icon: MacroIconName) { savePresets(presets.map((item) => item.id === preset.id ? { ...item, icon } : item)); setNotice(`${preset.label} now uses the ${MACRO_ICON_OPTIONS.find((item) => item.name === icon)?.label ?? "selected"} icon.`); }
  function deleteVaultPreset(preset: AOMacroPreset) { savePresets(presets.filter((item) => item.id !== preset.id)); setNotice(`${preset.label} deleted.`); setVaultMenu(null); }
  function reorderMainPreset(sourceId: string, targetId: string) {
    const ordered = presets.filter((item) => item.main).sort((a, b) => (a.mainOrder ?? 0) - (b.mainOrder ?? 0)); const from = ordered.findIndex((item) => item.id === sourceId); const to = ordered.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0 || from === to) return; const [moved] = ordered.splice(from, 1); ordered.splice(to, 0, moved!); const order = new Map(ordered.map((item, index) => [item.id, index])); savePresets(presets.map((item) => order.has(item.id) ? { ...item, mainOrder: order.get(item.id) } : item));
  }

  function sendTableCommand(command: AOTableCommand) {
    localStorage.setItem(userStorageKey(AO_TABLE_COMMAND_KEY), JSON.stringify(command));
    if (pathname === "/tables") window.dispatchEvent(new Event(AO_TABLE_COMMAND_EVENT)); else router.push("/tables");
    close();
  }
  function sendTodoCommand(command: AOTodoCommand) {
    localStorage.setItem(userStorageKey(AO_TODO_COMMAND_KEY), JSON.stringify(command));
    if (pathname === "/todo") window.dispatchEvent(new Event(AO_TODO_COMMAND_EVENT)); else router.push("/todo");
    close();
  }
  function sendWorkspaceText(text: string) {
    const value = text.trim(); if (!value) return;
    localStorage.setItem(userStorageKey(AO_WORKSPACE_TEXT_KEY), value);
    if (pathname === "/") window.dispatchEvent(new Event(AO_WORKSPACE_TEXT_EVENT)); else router.push("/");
    close();
  }
  function sendWorkspaceLineCommand(command: AOWorkspaceLineCommand) {
    localStorage.setItem(userStorageKey(AO_WORKSPACE_LINE_COMMAND_KEY), JSON.stringify(command));
    if (pathname === "/") window.dispatchEvent(new Event(AO_WORKSPACE_LINE_COMMAND_EVENT)); else router.push("/");
    close();
  }
  function openWorkspaceNote(note: Note) {
    localStorage.setItem(userStorageKey(DRAFT_KEY), JSON.stringify({ body: note.body, activeId: note.id }));
    localStorage.setItem(userStorageKey(AO_WORKSPACE_OPEN_KEY), JSON.stringify({ id: note.id, body: note.body }));
    if (pathname === "/") window.dispatchEvent(new Event(AO_WORKSPACE_OPEN_EVENT)); else router.push("/");
    close();
  }
  async function createWorkspaceNote(title: string, content = "") {
    const cleanTitle = title.trim() || "Untitled note"; const body = content.trim() ? `# ${cleanTitle}\n\n${content.trim()}` : `# ${cleanTitle}`;
    const note = await api<Note>("/api/v1/notes", { method: "POST", body: JSON.stringify({ title: cleanTitle, body }) }); openWorkspaceNote(note);
  }
  function currentDraft() { try { return JSON.parse(localStorage.getItem(userStorageKey(DRAFT_KEY)) ?? "{}") as { body?: string; activeId?: string | null }; } catch { return {}; } }
  async function updateCurrent(transform: (body: string) => string) {
    const draft = currentDraft(); const body = transform(draft.body ?? "");
    if (draft.activeId) { const note = await api<Note>(`/api/v1/notes/${draft.activeId}`, { method: "PATCH", body: JSON.stringify({ body }) }); openWorkspaceNote(note); }
    else await createWorkspaceNote(body.split("\n")[0] || "Untitled note", body.split("\n").slice(1).join("\n"));
  }

  function optionsFor(field: AOMacroField, context = values, macro = selected): Option[] {
    const pageTableId = context.page?.split(":")[0];
    const selectedTable = tables.find((item) => item.id === (context.tableId || pageTableId)) ?? tables[0];
    if (field.type === "table") return tables.map((item) => ({ value: item.id, label: item.name }));
    if (field.type === "note") return [...notes.map((item) => ({ value: item.id, label: item.title })), ...(macro?.action === "flow-sources-workspace" ? [{ value: "__new_note__", label: "＋ New Workspace Note" }] : [])];
    if (field.type === "todo") return todos.map((item) => ({ value: item.id, label: item.title }));
    if (field.type === "project") return projects.map((item) => ({ value: item.id, label: item.title }));
    if (field.type === "finding") return findings.map((item) => ({ value: item.id, label: item.name }));
    if (field.type === "source-result") return sourceResults.map((item) => ({ value: item.id, label: item.name }));
    if (field.type === "day-document") return [...dayDocuments.map((item) => ({ value: item.id, label: `${item.name} · ${item.day}` })), { value: "__new_day__", label: "＋ New Day Document…" }];
    if (field.type === "heading") return [1, 2, 3, 4].map((level) => ({ value: `h${level}`, label: `H${level}` }));
    if (field.type === "column") return (selectedTable?.columns ?? []).filter((item) => macro?.action === "column-show" ? item.hidden : macro?.action === "column-hide" ? !item.hidden : true).map((item) => ({ value: item.id, label: `${item.name} · ${item.type}` }));
    if (field.type === "column-type") return ([ ["text", "Text"], ["number", "Number"], ["percent", "Percent"], ["currency", "Currency"], ["single", "Single Select"], ["multiple", "Multiple Select"], ["date", "Date"], ["people", "People"], ["files", "Image & Files"], ["checkbox", "Checkbox"], ["reaction", "Reaction"], ["formula", "Formula"], ["relation", "Relation"], ["rollup", "Rollup"], ["page", "Page"], ["url", "URL"], ["phone", "Phone"], ["email", "Email"] ] as Array<[string, string]>).map(([value, label]) => ({ value, label }));
    if (field.type === "page-column") return [...(selectedTable?.columns ?? []).filter((item) => item.type === "page").map((item) => ({ value: item.id, label: item.name })), { value: "__new_page__", label: "＋ Create Page column" }];
    if (field.type === "row") return (selectedTable?.rows ?? []).map((item, index) => ({ value: item.id, label: String(item.cells[selectedTable!.columns[0]!.id] || `Row ${index + 1}`) }));
    if (field.type === "preset") {
      const textOnlyActions = ["workspace-new-preset", "workspace-append", "workspace-prepend", "row-preset", "page-append", "vault-run", "vault-edit"];
      return [...presets]
        .filter((item) => !textOnlyActions.includes(macro?.action ?? "") || (!item.macroId && !item.steps?.length))
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
        .map((item) => ({ value: item.id, label: item.label }));
    }
    if (field.type === "destination") return [{ value: "new-note", label: "New Workspace note" }, { value: "current-note", label: "Current Workspace note" }, { value: "new-table", label: "New table" }, { value: "page", label: "Table page" }];
    if (field.type === "page") return tables.flatMap((table) => table.columns.filter((column) => column.type === "page").flatMap((column) => table.rows.flatMap((row, index) => { const document = decodePageCell(row.cells[column.id]); return document.title || document.body ? [{ value: `${table.id}:${row.id}:${column.id}`, label: `${document.title || "Untitled"} · ${table.name} / ${column.name} / Row ${index + 1}` }] : []; })));
    return [];
  }
  function initialValuesFor(macro: AOMacroDefinition) {
    const initial: Record<string, string> = {};
    for (const field of macro.fields ?? []) { const options = optionsFor(field, initial, macro); if (options[0]) initial[field.key] = options[0].value; if (field.type === "number") initial[field.key] = "3"; if (field.type === "destination") initial[field.key] = "new-note"; }
    return initial;
  }
  function beginMacro(macro: AOMacroDefinition, overrides: Record<string, string> = {}) {
    const initial = initialValuesFor(macro);
    setValues({ ...initial, ...overrides }); setSelected(macro); setError(""); setNotice("");
  }
  function valueFor(key: string) { return values[key]?.trim() ?? ""; }
  function requiredReady() {
    const normal = (selected?.fields ?? []).every((field) => field.optional || Boolean(valueFor(field.key)));
    if (!normal) return false;
    if (valueFor("dayDocumentId") === "__new_day__") {
      const day = valueFor("dayDate");
      return Boolean(day) && !dayDocuments.some((item) => item.day === day);
    }
    return true;
  }

  function tableCommandFor(macro: AOMacroDefinition, context: Record<string, string>): AOTableCommand {
    const get = (key: string) => context[key]?.trim() ?? ""; const chosen = presetById(get("presetId"));
    return { action: macro.action, tableId: get("tableId"), columnId: get("columnId"), rowId: get("rowId"), destinationRowId: get("destinationRowId"), name: get("name"), title: get("title"), text: chosen?.text ?? get("text"), type: macro.value ?? get("type"), template: macro.value, query: get("query"), count: Number(get("count")) || undefined, page: get("page") };
  }
  function todoCommandFor(macro: AOMacroDefinition, context: Record<string, string>): AOTodoCommand {
    const note = notes.find((item) => item.id === context.noteId); const task = todos.find((item) => item.id === context.taskId); const noteLines = note?.body.split("\n").slice(1).map((line) => line.trim()).filter(Boolean) ?? [];
    return { action: macro.action, title: note?.title ?? context.title?.trim(), taskId: context.taskId?.trim(), taskTitle: task?.title ?? context.taskTitle?.trim(), description: context.description?.trim(), subtaskTitle: context.subtaskTitle?.trim(), subtaskDescription: context.subtaskDescription?.trim(), subtasks: macro.action === "todo-from-note-content" ? noteLines : undefined, dueDate: context.dueDate?.trim() };
  }
  function saveBuiltIn(macro: AOMacroDefinition) {
    if (presets.some((item) => item.macroId === macro.id)) { savePresets(presets.filter((item) => item.macroId !== macro.id)); setNotice(`${macro.label} removed from Vault.`); return; }
    savePresets([...presets, { id: crypto.randomUUID(), label: macro.label, text: "", macroId: macro.id, createdAt: new Date().toISOString() }]); setNotice(`${macro.label} saved to Vault.`);
  }
  function addBuilderStep() {
    const macro = AO_MACRO_CATALOG.find((item) => item.id === builderChoice); if (!macro || macro.category === "Vault") return;
    setBuilderSteps((current) => [...current, { id: crypto.randomUUID(), macroId: macro.id, values: initialValuesFor(macro) }]);
  }
  function saveCustomMacro() {
    if (!builderName.trim() || !builderSteps.length) return;
    savePresets([...presets, { id: crypto.randomUUID(), label: builderName.trim(), text: "", steps: builderSteps.map(({ macroId, values: stepValues }) => ({ macroId, values: stepValues })), createdAt: new Date().toISOString() }]);
    setBuilderName(""); setBuilderSteps([]); setMacroMode("home"); setNotice("Custom macro saved to Vault.");
  }
  async function runCustomMacro(entry: AOMacroPreset) {
    const commands: AOTableCommand[] = []; const todoCommands: AOTodoCommand[] = []; setBusy(true); setError("");
    try {
      for (const step of entry.steps ?? []) { const macro = AO_MACRO_CATALOG.find((item) => item.id === step.macroId); if (!macro) continue; if (macro.category === "Workspace") await runWorkspace(macro, step.values); else if (macro.category === "To Do") todoCommands.push(todoCommandFor(macro, step.values)); else if (macro.category === "Flows") await runFlow(macro, step.values); else if (macro.category !== "Vault") commands.push(tableCommandFor(macro, step.values)); }
      touchPreset(entry.id); if (todoCommands.length && !commands.length) sendTodoCommand({ action: "todo-batch", commands: todoCommands }); else if (commands.length) { if (todoCommands.length) localStorage.setItem(userStorageKey(AO_TODO_COMMAND_KEY), JSON.stringify({ action: "todo-batch", commands: todoCommands })); sendTableCommand({ action: "batch", commands }); } else close();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Custom macro failed."); } finally { setBusy(false); }
  }

  async function runWorkspace(macro: AOMacroDefinition, context = values) {
    const get = (key: string) => context[key]?.trim() ?? ""; const chosenPreset = presetById(get("presetId"));
    if (macro.action === "workspace-new") return createWorkspaceNote(get("title"));
    if (macro.action === "workspace-new-preset") { if (!chosenPreset) throw new Error("Choose a saved text preset."); touchPreset(chosenPreset.id); return createWorkspaceNote(get("title"), chosenPreset.text); }
    if (macro.action === "workspace-template") return createWorkspaceNote(get("title"), WORKSPACE_TEMPLATES[macro.value ?? ""] ?? "");
    if (macro.action === "workspace-open") { const found = notes.find((item) => item.id === get("noteId")); if (!found) throw new Error("Choose a saved note."); return openWorkspaceNote(found); }
    if (macro.action === "workspace-prepend") { if (!chosenPreset) throw new Error("Choose a saved text preset."); touchPreset(chosenPreset.id); return updateCurrent((body) => body.trim() ? `${chosenPreset.text}\n${body.trimStart()}` : chosenPreset.text); }
    if (macro.action === "workspace-add-comment") return sendWorkspaceLineCommand({ action: "add-comment", text: get("comment") });
    if (macro.action === "workspace-add-heading") return sendWorkspaceLineCommand({ action: "add-heading", text: get("text"), kind: get("heading") as "h1" | "h2" | "h3" | "h4" });
    if (macro.action === "workspace-add-code") return sendWorkspaceLineCommand({ action: "add-code", text: get("text") });
  }

  function writeScoped(key: string, value: unknown) { localStorage.setItem(userStorageKey(key), JSON.stringify(value)); }
  function findingMarkdown(item: Finding) {
    const result = item.result;
    return `# ${result.note.title} — Verification Findings\n\n## Evidence trust score: ${result.trustScore}/100\n\n${result.trustRationale}\n\n## Summary\n${result.summary}\n\n## How it was checked\n${result.method.map((step) => `- ${step}`).join("\n")}\n\n## Assertions\n${result.confirmed.map((entry) => `### ${entry.assertion}\n**${entry.status}** — ${entry.explanation}`).join("\n\n")}\n\n## Sources and evidence\n${result.evidence.map((entry) => `- [${entry.title}](${entry.url}) — ${entry.publisher}. ${entry.relevance}`).join("\n")}\n\n## Uncertainty\n${result.uncertainty.map((entry) => `- ${entry}`).join("\n") || "- No material uncertainty reported."}\n\n## Verification response\n${result.answer}`;
  }
  function sourcesMarkdown(item: SourceResult) { return `# ${item.name}\n\n${item.request}\n\n## Sources\n${item.sources.map((source) => `### [${source.title}](${source.url})\n${source.publisher}\n\n${source.summary}\n\n*${source.trustReason}*`).join("\n\n")}`; }
  function taskMarkdown(task: TodoItem) { return `# ${task.title}\n\n${task.description ?? ""}${task.subtasks?.length ? `\n\n## Subtasks\n${task.subtasks.map((subtask) => `- ${subtask.title}${subtask.description ? `\n\n  ${subtask.description}` : ""}`).join("\n")}` : ""}`.trim(); }
  function saveDayDocument(body: string, sourceDayId: string, preferredDay?: string, taskId?: string) {
    const existing = sourceDayId === "__new_day__" ? undefined : dayDocuments.find((item) => item.id === sourceDayId);
    const day = existing?.day ?? preferredDay;
    if (!day) throw new Error("Choose a new Day Document date.");
    if (!existing && dayDocuments.some((item) => item.day === day)) throw new Error("A Day Document already exists for that date.");
    const now = new Date().toISOString();
    const document: DayDocument = existing ? { ...existing, body: existing.body.trim() ? `${existing.body.trimEnd()}\n\n${body}` : body, updatedAt: now } : { id: crypto.randomUUID(), name: `${day} day document`, day, body, taskId, updatedAt: now };
    const next = existing ? dayDocuments.map((item) => item.id === existing.id ? document : item) : [document, ...dayDocuments];
    writeScoped(DAY_DOCUMENTS_KEY, next); setDayDocuments(next);
    localStorage.setItem(userStorageKey(TIMELINE_OPEN_DOCUMENT_KEY), document.id);
    router.push("/history"); close();
  }
  function writeTodos(next: TodoItem[]) { writeScoped(TODO_STORAGE_KEY, next); setTodos(next); window.dispatchEvent(new Event(TODO_STORAGE_EVENT)); }
  function createFolder(title: string) {
    const list: TodoList = { id: crypto.randomUUID(), title: title.trim() || "New list", createdAt: new Date().toISOString() };
    let current: TodoList[] = [];
    try { const parsed = JSON.parse(localStorage.getItem(userStorageKey(TODO_LIST_STORAGE_KEY)) ?? "[]") as TodoList[]; current = Array.isArray(parsed) ? parsed : []; } catch { /* start fresh */ }
    writeScoped(TODO_LIST_STORAGE_KEY, [...current, list]); return list;
  }
  async function runFlow(macro: AOMacroDefinition, context = values) {
    const get = (key: string) => context[key]?.trim() ?? "";
    const selectedNote = notes.find((item) => item.id === get("noteId"));
    const selectedTask = todos.find((item) => item.id === get("taskId"));
    const selectedFinding = findings.find((item) => item.id === get("findingId"));
    const selectedSources = sourceResults.find((item) => item.id === get("sourceResultId"));
    if (macro.action === "flow-add-note") return createWorkspaceNote(get("title"));
    if (macro.action === "flow-note-project") {
      if (!selectedNote || !projects.some((item) => item.id === get("projectId"))) throw new Error("Choose both a saved note and Project.");
      let assignments: Record<string, string> = {}; try { assignments = JSON.parse(localStorage.getItem(userStorageKey(NOTE_PROJECTS_KEY)) ?? "{}"); } catch { /* start clean */ }
      writeScoped(NOTE_PROJECTS_KEY, { ...assignments, [selectedNote.id]: get("projectId") }); window.dispatchEvent(new Event(AO_WORKSPACE_PROJECTS_EVENT)); setNotice(`${selectedNote.title} added to the selected Project.`); setSelected(null); if (pathname !== "/") router.push("/"); return;
    }
    if (macro.action === "flow-project-note") {
      const project: WorkspaceProject = { id: crypto.randomUUID(), title: get("projectName") || "New project", createdAt: new Date().toISOString() };
      const next = [...projects, project]; writeScoped(PROJECTS_KEY, next); setProjects(next); return createWorkspaceNote(get("title") || project.title);
    }
    if (macro.action === "flow-verify-note") {
      if (!selectedNote) throw new Error("Choose a saved Workspace note.");
      writeScoped(VERIFY_PREFILL_KEY, { noteId: selectedNote.id, context: "" }); router.push("/verify"); close(); return;
    }
    if (macro.action === "flow-verify-context" || macro.action === "flow-verify-sources") {
      if (!selectedNote) throw new Error("Choose a saved Workspace note.");
      const verifyRequest = () => api<Finding["result"]>("/api/v1/verify-note", { method: "POST", body: JSON.stringify({ noteId: selectedNote.id, context: get("context"), messages: [] }) });
      if (macro.action === "flow-verify-sources") {
        const [verification, [sourceSearch]] = await Promise.all([verifyRequest(), Promise.all([
          api<{ note: { id: string; title: string }; sources: SourceResult["sources"] }>("/api/v1/sources/find", { method: "POST", body: JSON.stringify({ noteId: selectedNote.id, notes: get("request") }) }),
          api("/api/v1/sources", { method: "POST", body: JSON.stringify({ name: `${selectedNote.title} sources`, workspaceNoteId: selectedNote.id, notes: get("request") }) }),
        ])]);
        const finding: Finding = { id: crypto.randomUUID(), name: `${selectedNote.title} findings`, result: verification, messages: [{ role: "assistant", content: verification.answer }], updatedAt: new Date().toISOString() };
        const nextFindings = [finding, ...findings]; writeScoped(FINDINGS_KEY, nextFindings); setFindings(nextFindings); writeScoped(VERIFY_OPEN_FINDING_KEY, finding.id);
        const source: SourceResult = { id: crypto.randomUUID(), name: `${selectedNote.title} sources`, noteId: selectedNote.id, noteTitle: sourceSearch.note.title, request: get("request"), sources: sourceSearch.sources, updatedAt: new Date().toISOString() };
        const nextSources = [source, ...sourceResults]; writeScoped(SOURCE_RESULTS_KEY, nextSources); setSourceResults(nextSources); writeScoped(SOURCES_OPEN_RESULT_KEY, source.id); router.push("/sources"); close(); return;
      }
      const verification = await verifyRequest();
      const finding: Finding = { id: crypto.randomUUID(), name: `${selectedNote.title} findings`, result: verification, messages: [{ role: "assistant", content: verification.answer }], updatedAt: new Date().toISOString() };
      const nextFindings = [finding, ...findings]; writeScoped(FINDINGS_KEY, nextFindings); setFindings(nextFindings); writeScoped(VERIFY_OPEN_FINDING_KEY, finding.id);
      if (macro.action === "flow-verify-context") { router.push("/verify"); close(); return; }
    }
    if (macro.action === "flow-todo-workspace") { if (!selectedTask) throw new Error("Choose a saved To-Do."); return updateCurrent((body) => body.trim() ? `${body.trimEnd()}\n\n${taskMarkdown(selectedTask)}` : taskMarkdown(selectedTask)); }
    if (macro.action === "flow-folder-task-subtask") {
      const folder = createFolder(get("folderName")); const todo: TodoItem = { id: crypto.randomUUID(), title: get("title"), description: get("description") || undefined, completed: false, priority: "normal", createdAt: new Date().toISOString(), listId: folder.id, subtasks: [{ id: crypto.randomUUID(), title: get("subtaskTitle"), description: get("subtaskDescription") || undefined, completed: false }] }; writeTodos([...todos, todo]); router.push("/todo"); close(); return;
    }
    if (["flow-folder-select-task", "flow-folder-task-subtask-existing", "flow-folder-task-subtask-details"].includes(macro.action)) {
      if (!selectedTask) throw new Error("Choose a saved To-Do."); const folder = createFolder(get("folderName"));
      const next = todos.map((item) => item.id === selectedTask.id ? { ...item, listId: folder.id, ...(macro.action === "flow-folder-select-task" ? {} : { subtasks: [...(item.subtasks ?? []), { id: crypto.randomUUID(), title: get("subtaskTitle"), description: get("subtaskDescription") || undefined, completed: false }] }) } : item);
      writeTodos(next); router.push("/todo"); close(); return;
    }
    if (macro.action === "flow-finding-day") { if (!selectedFinding) throw new Error("Choose a saved finding."); return saveDayDocument(findingMarkdown(selectedFinding), get("dayDocumentId")); }
    if (macro.action === "flow-sources-day") { if (!selectedSources) throw new Error("Choose saved source results."); return saveDayDocument(sourcesMarkdown(selectedSources), get("dayDocumentId"), get("dayDate")); }
    if (macro.action === "flow-sources-workspace") {
      if (!selectedSources) throw new Error("Choose saved source results."); const content = sourcesMarkdown(selectedSources); const target = get("workspaceTarget");
      if (target === "__new_note__") return createWorkspaceNote(selectedSources.name, content);
      const note = notes.find((item) => item.id === target); if (!note) throw new Error("Choose a Workspace note.");
      await api<Note>(`/api/v1/notes/${note.id}`, { method: "PATCH", body: JSON.stringify({ body: note.body.trim() ? `${note.body.trimEnd()}\n\n${content}` : content }) }); setNotice("Sources appended to Workspace."); setSelected(null); return;
    }
    if (macro.action === "flow-finding-table" || macro.action === "flow-sources-table") {
      const content = macro.action === "flow-finding-table" ? (selectedFinding ? findingMarkdown(selectedFinding) : "") : (selectedSources ? sourcesMarkdown(selectedSources) : "");
      if (!content) throw new Error("Choose saved content to add."); sendTableCommand({ action: "page-create-content", tableId: get("tableId"), title: macro.action === "flow-finding-table" ? selectedFinding!.name : selectedSources!.name, text: content }); return;
    }
    if (macro.action === "flow-todo-calendar") { if (!selectedTask) throw new Error("Choose a saved To-Do."); writeTodos(todos.map((item) => item.id === selectedTask.id ? { ...item, dueDate: get("dueDate") } : item)); router.push("/history"); close(); return; }
    if (macro.action === "flow-todo-day") {
      const task: TodoItem = { id: crypto.randomUUID(), title: get("title"), completed: false, priority: "normal", dueDate: get("dayDate"), createdAt: new Date().toISOString() }; writeTodos([...todos, task]);
      const existing = dayDocuments.find((item) => item.day === get("dayDate")); return saveDayDocument(taskMarkdown(task), existing?.id ?? "__new_day__", get("dayDate"), task.id);
    }
    if (macro.action === "flow-todo-to-day") { if (!selectedTask) throw new Error("Choose a saved To-Do."); return saveDayDocument(taskMarkdown(selectedTask), get("dayDocumentId"), get("dayDate"), selectedTask.id); }
    if (macro.action === "flow-note-to-day") { if (!selectedNote) throw new Error("Choose a saved Workspace note."); return saveDayDocument(selectedNote.body, get("dayDocumentId"), get("dayDate")); }
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
    if (macro.action === "vault-run") { touchPreset(chosen.id); const destination = valueFor("destination"); if (destination === "new-note") await createWorkspaceNote(chosen.label, chosen.text); else if (destination === "current-note") sendWorkspaceText(chosen.text); else if (destination === "new-table") sendTableCommand({ action: "add-table", text: chosen.text }); else { if (!valueFor("page")) throw new Error("Choose a destination page."); sendTableCommand({ action: "page-append", page: valueFor("page"), text: chosen.text }); } return; }
    setSelected(null); setNotice("Vault updated.");
  }

  async function runSelected() {
    if (!selected || !requiredReady()) return; setBusy(true); setError("");
    try {
      if (selected.category === "Workspace") await runWorkspace(selected);
      else if (selected.category === "To Do") sendTodoCommand(todoCommandFor(selected, values));
      else if (selected.category === "Vault") await runVault(selected);
      else if (selected.category === "Flows") await runFlow(selected);
      else { const chosen = presetById(valueFor("presetId")); if (chosen) touchPreset(chosen.id); sendTableCommand(tableCommandFor(selected, values)); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Macro failed."); } finally { setBusy(false); }
  }

  const filteredMacros = AO_MACRO_CATALOG.filter((item) => (!category || item.category === category) && (!query || `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase())));
  const builderCatalog = AO_MACRO_CATALOG.filter((item) => item.category !== "Vault");
  function vaultType(item: AOMacroPreset) { if (isTextPreset(item)) return "Text"; if (item.steps?.length) return "Custom"; return AO_MACRO_CATALOG.find((macro) => macro.id === item.macroId)?.category ?? "Custom"; }
  const vaultItems = [...presets].filter((item) => (vaultTextOnly ? isTextPreset(item) : !isTextPreset(item)) && (!vaultRecent || item.lastUsedAt) && (vaultTextOnly || vaultCategory === "All" || vaultType(item) === vaultCategory) && (!vaultQuery || `${item.label} ${item.text}`.toLowerCase().includes(vaultQuery.toLowerCase()))).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.lastUsedAt ?? b.createdAt ?? "").localeCompare(a.lastUsedAt ?? a.createdAt ?? ""));
  const mainItems = presets.filter((item) => item.main).sort((a, b) => (a.mainOrder ?? 0) - (b.mainOrder ?? 0)).slice(0, MAIN_MACRO_LIMIT);
  const menuPreset = vaultMenu ? presets.find((item) => item.id === vaultMenu.id) : undefined;
  const builderReady = Boolean(builderName.trim() && builderSteps.length && builderSteps.every((step) => { const macro = AO_MACRO_CATALOG.find((item) => item.id === step.macroId); return (macro?.fields ?? []).every((field) => field.optional || Boolean(step.values[field.key]?.trim())); }));
  function goBack() { if (selected) setSelected(null); else if (customToRun) setCustomToRun(null); else if (view === "macro" && macroMode !== "home") setMacroMode("home"); else setView("main"); }
  const titles: Record<View, string> = { main: "Macro Key Menu", macro: selected?.label ?? (macroMode === "builder" ? "Create macro" : macroMode === "presets" ? "Presets" : "Macro"), route: "Route", turbo: "Turbo", vault: customToRun?.label ?? "Vault", preferences: "Preferences" };

  return <div className={styles.root} ref={rootRef}>
    {open && <section className={`${styles.panel}${view === "macro" && macroMode === "builder" ? ` ${styles.builderPanel}` : ""}`} role="dialog" aria-label="AO macro key menu">
      <header className={styles.header}>{view === "main" ? <AOLogo /> : <button type="button" className={styles.back} aria-label="Back" onClick={goBack}><MacroIcon name="back" /></button>}<div><strong>{titles[view]}</strong><small>AO · Akiiro Operator</small></div><button type="button" className={styles.close} aria-label="Close AO macro key menu" onClick={close}><MacroIcon name="close" /></button></header>
      {view === "main" && <div className={styles.list}>
        <button type="button" onClick={() => showView("macro")}><span className={styles.infoMark} tabIndex={0} aria-label="Macro information" data-tip="Search, configure and run more than 70 app shortcuts."><MacroIcon name="macro" /></span><b>Macro</b><MacroIcon name="chevron" className={styles.chevron} /></button>
        <button type="button" onClick={() => showView("route")}><span className={styles.infoMark} tabIndex={0} aria-label="Route information" data-tip="Jump directly to a destination in Work Sync."><MacroIcon name="route" /></span><b>Route</b><MacroIcon name="chevron" className={styles.chevron} /></button>
        <button type="button" onClick={() => showView("turbo")}><span className={styles.infoMark} tabIndex={0} aria-label="Turbo information" data-tip="Send written input to Workspace or a new table."><MacroIcon name="turbo" /></span><b>Turbo</b><MacroIcon name="chevron" className={styles.chevron} /></button>
        <button type="button" onClick={() => showView("vault")}><VaultIcon info /><b>Vault</b><MacroIcon name="chevron" className={styles.chevron} /></button>
        <hr /><button type="button" onClick={() => showView("preferences")}><PreferencesGear /><b>Preferences</b><MacroIcon name="chevron" className={styles.chevron} /></button>
      </div>}
      {view === "macro" && !selected && macroMode === "home" && <div className={styles.list}>
        {notice && <p className={styles.notice}>{notice}</p>}
        <button type="button" onClick={() => setMacroMode("presets")}><span className={styles.infoMark} tabIndex={0} aria-label="Presets information" data-tip="Browse, configure and save built-in app shortcuts.">i</span><b>Presets</b><MacroIcon name="chevron" className={styles.chevron} /></button>
        <button type="button" onClick={() => beginMacro(AO_MACRO_CATALOG.find((item) => item.id === "vault-create")!)}><span className={styles.infoMark} tabIndex={0} aria-label="Text preset information" data-tip="Save reusable text in Vault for notes, pages and macros.">i</span><b>Create text preset</b><MacroIcon name="chevron" className={styles.chevron} /></button>
        <button type="button" onClick={() => { setBuilderName(""); setBuilderSteps([]); setMacroMode("builder"); }}><VaultIcon /><b>Create macro</b><MacroIcon name="chevron" className={styles.chevron} /></button>
        <hr /><button type="button" onClick={() => showView("vault")}><VaultIcon /><b>Open Vault</b><MacroIcon name="chevron" className={styles.chevron} /></button>
      </div>}
      {view === "macro" && !selected && macroMode === "presets" && <div className={styles.macroBrowser}>
        <label className={styles.search}><MacroIcon name="search" /><input aria-label="Search macros" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${AO_MACRO_CATALOG.length} presets…`} /></label>
        <div className={styles.categories}>{AO_MACRO_CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? styles.active : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
        {notice && <p className={styles.notice}>{notice}</p>}<div className={styles.macroResults}>{filteredMacros.map((macro) => <div className={styles.macroResultRow} key={macro.id}><button type="button" onClick={() => beginMacro(macro)}><span>{macro.label}</span><small>{macro.description}</small><MacroIcon name="chevron" className={styles.chevron} /></button><button type="button" className={styles.savePreset} onClick={() => saveBuiltIn(macro)}>{presets.some((item) => item.macroId === macro.id) ? "Unsave" : "Save"}</button></div>)}</div>
      </div>}
      {view === "macro" && !selected && macroMode === "builder" && <div className={styles.builder}>
        <label>Macro name<input value={builderName} onChange={(event) => setBuilderName(event.target.value)} placeholder="My workflow" /></label>
        <div className={styles.builderAdd}><select aria-label="Preset element" value={builderChoice} onChange={(event) => setBuilderChoice(event.target.value)}>{AO_MACRO_CATEGORIES.filter((item) => item !== "Vault").map((item) => <optgroup key={item} label={item}>{builderCatalog.filter((macro) => macro.category === item).map((macro) => <option key={macro.id} value={macro.id}>{macro.label}</option>)}</optgroup>)}</select><button type="button" onClick={addBuilderStep}>Add step</button></div>
        <div className={styles.builderSteps}>{builderSteps.length ? builderSteps.map((step, index) => { const macro = AO_MACRO_CATALOG.find((item) => item.id === step.macroId)!; return <section key={step.id}><header><span>{index + 1}</span><strong>{macro.label}</strong><button type="button" aria-label={`Remove ${macro.label}`} onClick={() => setBuilderSteps((current) => current.filter((item) => item.id !== step.id))}><MacroIcon name="close" /></button></header>{(macro.fields ?? []).map((field) => { const options = optionsFor(field, step.values, macro); const isSelect = options.length || ["table", "column", "column-type", "row", "page-column", "page", "preset", "destination", "note", "todo", "heading", "project", "finding", "source-result", "day-document"].includes(field.type); const update = (value: string) => setBuilderSteps((current) => current.map((item) => item.id === step.id ? { ...item, values: { ...item.values, [field.key]: value, ...(field.type === "table" ? { columnId: "", rowId: "" } : {}) } } : item)); return <label key={`${step.id}-${field.key}`}>{field.label}{isSelect ? <select value={step.values[field.key] ?? ""} onChange={(event) => update(event.target.value)}><option value="">Choose…</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "textarea" ? <textarea value={step.values[field.key] ?? ""} onChange={(event) => update(event.target.value)} placeholder={field.placeholder} /> : <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={step.values[field.key] ?? ""} onChange={(event) => update(event.target.value)} placeholder={field.placeholder} />}</label>; })}</section>; }) : <p>Add built-in preset elements to create a reusable sequence.</p>}</div>
        {error && <p className={styles.error}>{error}</p>}<button type="button" className={styles.builderSave} disabled={!builderReady} onClick={saveCustomMacro}>Save macro to Vault</button>
      </div>}
      {view === "macro" && selected && <form className={styles.runner} onSubmit={(event) => { event.preventDefault(); void runSelected(); }}><p>{selected.description}</p>{(selected.fields ?? []).map((field) => { if (field.key === "dayDate" && valueFor("dayDocumentId") && valueFor("dayDocumentId") !== "__new_day__" && selected.action !== "flow-todo-day") return null; const options = optionsFor(field); const isSelect = options.length || ["table", "column", "column-type", "row", "page-column", "page", "preset", "destination", "note", "todo", "heading", "project", "finding", "source-result", "day-document"].includes(field.type); return <label key={`${field.key}-${field.type}`}>{field.label}{isSelect ? <select value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value, ...(field.type === "table" ? { columnId: "", rowId: "" } : {}) }))}><option value="">Choose…</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "textarea" ? <textarea value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} /> : <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} min={field.type === "number" ? 1 : undefined} max={field.type === "number" ? 100 : undefined} value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} />}</label>; })}{valueFor("dayDocumentId") === "__new_day__" && dayDocuments.some((item) => item.day === valueFor("dayDate")) ? <p className={styles.error}>A Day Document already exists for that date. Choose an available date.</p> : null}{selected.action === "vault-run" && valueFor("destination") === "page" && <label>Page<select value={values.page ?? ""} onChange={(event) => setValues((current) => ({ ...current, page: event.target.value }))}><option value="">Choose…</option>{optionsFor({ key: "page", label: "Page", type: "page" }).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}{error && <p className={styles.error}>{error}</p>}<button type="submit" disabled={busy || !requiredReady()}>{busy ? "Running…" : selected.action === "vault-create" ? "Save Macro" : "Run macro"}</button></form>}
      {view === "route" && <div className={styles.list}><p className={styles.hint}>Open a destination in this app.</p>{ROUTES.map((route) => <button type="button" key={route.href} className={pathname === route.href ? styles.active : ""} onClick={() => { router.push(route.href); close(); }}><MacroIcon name={route.icon} className={styles.menuIcon} /><b>{route.label}</b>{pathname === route.href ? <em>Current</em> : <MacroIcon name="chevron" className={styles.chevron} />}</button>)}</div>}
      {view === "turbo" && <form className={styles.form} onSubmit={(event) => { event.preventDefault(); sendWorkspaceText(turboText); }}><label>Input prompt<textarea value={turboText} onChange={(event) => setTurboText(event.target.value)} placeholder="Write content for a destination…" autoFocus /></label><div className={styles.actions}><button type="submit" disabled={!turboText.trim()}>Write in Workspace</button><button type="button" disabled={!turboText.trim()} onClick={() => sendTableCommand({ action: "add-table", text: turboText })}>Make a new table</button></div></form>}
      {view === "vault" && customToRun && <div className={styles.customRun}><p>Run this saved sequence:</p><ol>{(customToRun.steps ?? []).map((step) => <li key={`${customToRun.id}-${step.macroId}`}>{AO_MACRO_CATALOG.find((item) => item.id === step.macroId)?.label ?? "Unavailable step"}</li>)}</ol>{error && <p className={styles.error}>{error}</p>}<button type="button" disabled={busy} onClick={() => void runCustomMacro(customToRun)}>{busy ? "Running…" : "Run custom macro"}</button></div>}
      {view === "vault" && !customToRun && <div className={styles.vault}>
        <label className={styles.search}><MacroIcon name="search" /><input aria-label="Search Vault" value={vaultQuery} onChange={(event) => setVaultQuery(event.target.value)} placeholder="Search saved macros…" /></label>
        <div className={styles.vaultMainHeader}><strong>Main Macro</strong><span>{mainItems.length}/{MAIN_MACRO_LIMIT}</span></div>
        {mainItems.length ? <div className={styles.mainMacros} aria-label="Main Macro shortcuts">{mainItems.map((preset) => <button type="button" key={preset.id} draggable onMouseEnter={(event) => showMainTooltip(event.currentTarget, preset.label)} onMouseLeave={() => setMainTooltip(null)} onFocus={(event) => showMainTooltip(event.currentTarget, preset.label)} onBlur={() => setMainTooltip(null)} onDragStart={(event) => { setMainTooltip(null); event.dataTransfer.setData("text/main-macro", preset.id); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const source = event.dataTransfer.getData("text/main-macro"); if (source) reorderMainPreset(source, preset.id); }} onClick={() => launchPreset(preset)} aria-label={`Run ${preset.label}`}><MacroIcon name={macroIconFor(preset.macroId, Boolean(preset.steps?.length), preset.icon)} className={styles.mainMacroIcon} /></button>)}</div> : <p className={styles.mainEmpty}>Choose up to six shortcuts from Vault.</p>}
        <div className={styles.categories}>{VAULT_CATEGORIES.map((item) => <button type="button" key={item} className={!vaultTextOnly && vaultCategory === item ? styles.active : ""} onClick={() => { setVaultTextOnly(false); setVaultCategory(item); }}>{item}</button>)}</div>
        {vaultRecent && <p className={styles.notice}>Recently used macros</p>}{notice && <p className={styles.notice}>{notice}</p>}
        <div className={styles.vaultTextActions}><button type="button" onClick={() => { setView("macro"); setMacroMode("home"); beginMacro(AO_MACRO_CATALOG.find((item) => item.id === "vault-create")!); }}>Create text preset</button><button type="button" className={vaultTextOnly ? styles.active : ""} onClick={() => { setVaultTextOnly(true); setVaultRecent(false); }}>View saved text</button></div>
        {vaultTextOnly && <p className={styles.notice}>Saved text</p>}{vaultItems.length ? <div className={styles.vaultItems}>{vaultItems.map((preset) => <div className={styles.vaultItem} key={preset.id}><span aria-hidden>{preset.pinned ? <MacroIcon name="pin" /> : null}</span><button type="button" onClick={() => launchPreset(preset)}><strong>{preset.label}</strong><small>{preset.steps?.length ? `${preset.steps.length} step custom macro` : preset.macroId ? `Saved ${vaultType(preset)} preset` : preset.text}</small></button><div className={styles.vaultTail}><span title={isTextPreset(preset) ? "Text preset" : "Macro"}><MacroIcon name={isTextPreset(preset) ? "text" : "macro"} /></span><button type="button" data-vault-chevron aria-label={`Options for ${preset.label}`} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const width = 218; setVaultMenu(vaultMenu?.id === preset.id ? null : { id: preset.id, left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 210)) }); }}><MacroIcon name="chevron" /></button></div></div>)}</div> : <p className={styles.empty}>{vaultTextOnly ? "No saved text yet." : vaultRecent ? "No recently used macros." : "No saved macros match this category."}</p>}
      </div>}
      {menuPreset && vaultMenu && createPortal(<div className={styles.vaultActions} style={{ left: vaultMenu.left, top: vaultMenu.top }} role="menu" aria-label={`Manage ${menuPreset.label}`} data-vault-actions>

        <button type="button" onClick={() => toggleMainPreset(menuPreset)}><MacroIcon name={menuPreset.main ? "pin" : "add"} />{menuPreset.main ? "Remove from Main Macro" : "Add to Main Macro"}</button>
        {menuPreset.main && <><p>Macro Panel icon</p><div className={styles.mainIconGrid} role="group" aria-label={`Choose Macro Panel icon for ${menuPreset.label}`}>{MACRO_ICON_OPTIONS.map((icon) => <button type="button" key={icon.name} className={menuPreset.icon === icon.name ? styles.active : ""} aria-label={`Use ${icon.label} icon`} aria-pressed={menuPreset.icon === icon.name} onClick={() => setPresetIcon(menuPreset, icon.name)}><MacroIcon name={icon.name} /></button>)}</div></>}
        <hr /><button type="button" className={styles.danger} onClick={() => deleteVaultPreset(menuPreset)}><MacroIcon name="delete" />Delete</button>
      </div>, document.body)}
      {mainTooltip && createPortal(<div className={styles.mainMacroTooltip} style={{ left: mainTooltip.left, top: mainTooltip.top }} role="tooltip">{mainTooltip.label}</div>, document.body)}
      {view === "preferences" && <div className={styles.preferences}><p className={styles.hint}>Text presets are now created, searched and run inside Macro and Vault.</p><button type="button" className={styles.save} onClick={() => showView("vault")}>Open Vault</button></div>}
    </section>}
    <button type="button" className={styles.trigger} aria-label="Open AO macro key menu" aria-expanded={open} onClick={() => { setOpen((current) => !current); if (open) setView("main"); }}><AOLogo /></button>
  </div>;
}
