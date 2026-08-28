"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/client-api";
import { AO_MACRO_CATALOG, AO_MACRO_CATEGORIES, type AOMacroDefinition, type AOMacroField } from "@/lib/ao-catalog";
import {
  AO_MACROS_KEY, AO_TABLE_COMMAND_EVENT, AO_TABLE_COMMAND_KEY, AO_WORKSPACE_OPEN_EVENT,
  AO_WORKSPACE_OPEN_KEY, AO_WORKSPACE_TEXT_EVENT, AO_WORKSPACE_TEXT_KEY,
  type AOCustomMacroStep, type AOMacroPreset, type AOTableCommand,
} from "@/lib/ao-macro";
import { decodePageCell, type WorkTable } from "@/lib/table-model";
import { AO_TODO_COMMAND_EVENT, AO_TODO_COMMAND_KEY, type AOTodoCommand } from "@/lib/todo-model";
import styles from "./AOMacroMenu.module.css";

type View = "main" | "macro" | "route" | "turbo" | "vault" | "preferences";
type Note = { id: string; title: string; body: string; createdAt: string; updatedAt: string };
type Option = { value: string; label: string };
type MacroMode = "home" | "presets" | "builder";
type BuilderStep = AOCustomMacroStep & { id: string };
const DRAFT_KEY = "work-sync:workspace-draft";
const TABLES_KEY = "work-sync:tables";
const MAIN_MACRO_LIMIT = 5;
const MAIN_MACRO_ICONS = ["◇", "▦", "▤", "✓", "⌁", "⊙", "＋", "◉", "∆", "A", "T", "M"];

const ROUTES = [["Workspace", "/", "⌂"], ["To Do", "/todo", "□"], ["Tables", "/tables", "▦"], ["Sources", "/sources", "S"], ["Verify", "/verify", "✓"], ["History", "/history", "H"], ["Connect", "/connect", "C"]] as const;
const VAULT_CATEGORIES = ["All", "Text", "Workspace", "To Do", "Tables", "Rows", "Columns", "Pages", "Custom"] as const;
const WORKSPACE_TEMPLATES: Record<string, string> = {
  meeting: "## Attendees\n\n## Agenda\n\n## Decisions\n\n## Follow-up",
  project: "## Objective\n\n## Owner\n\n## Milestones\n\n## Risks\n\n## Next actions",
};

function AOLogo() { return <span className={styles.logo} aria-hidden><svg viewBox="0 0 32 32" focusable="false"><path d="M3.75 22.5 9.25 8.75l5.5 13.75M5.9 17h6.7" /><rect x="18" y="8.75" width="10" height="13.75" rx="5" /></svg></span>; }
function VaultIcon({ info = false }: { info?: boolean }) { return <span className={`${styles.vaultIcon}${info ? ` ${styles.vaultInfo}` : ""}`} tabIndex={info ? 0 : undefined} aria-label={info ? "Vault information" : undefined} data-tip={info ? "See, run and manage all saved text and custom macros." : undefined} aria-hidden={info ? undefined : true}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="9" ry="3.5" /><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)" /></svg></span>; }

export function AOMacroMenu() {
  const router = useRouter(); const pathname = usePathname(); const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); const [view, setView] = useState<View>("main");
  const [turboText, setTurboText] = useState(""); const [presets, setPresets] = useState<AOMacroPreset[]>([]);
  const [tables, setTables] = useState<WorkTable[]>([]); const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("Workspace");
  const [selected, setSelected] = useState<AOMacroDefinition | null>(null); const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [vaultQuery, setVaultQuery] = useState("");
  const [vaultCategory, setVaultCategory] = useState<(typeof VAULT_CATEGORIES)[number]>("All");
  const [vaultRecent, setVaultRecent] = useState(false);
  const [macroMode, setMacroMode] = useState<MacroMode>("home");
  const [builderName, setBuilderName] = useState("");
  const [builderChoice, setBuilderChoice] = useState(AO_MACRO_CATALOG[0]!.id);
  const [builderSteps, setBuilderSteps] = useState<BuilderStep[]>([]);
  const [customToRun, setCustomToRun] = useState<AOMacroPreset | null>(null);
  const [vaultMenu, setVaultMenu] = useState<{ id: string; left: number; top: number } | null>(null);
  const [mainIconPrompt, setMainIconPrompt] = useState<string | null>(null);
  const [mainTooltip, setMainTooltip] = useState<{ label: string; left: number; top: number } | null>(null);

  function readLocalData() {
    try { const parsed = JSON.parse(localStorage.getItem(AO_MACROS_KEY) ?? "[]") as AOMacroPreset[]; setPresets(Array.isArray(parsed) ? parsed.map((item) => item.main ? item : { ...item, icon: undefined }) : []); } catch { setPresets([]); }
    try { const parsed = JSON.parse(localStorage.getItem(TABLES_KEY) ?? "[]") as WorkTable[]; setTables(Array.isArray(parsed) ? parsed : []); } catch { setTables([]); }
  }
  useEffect(readLocalData, []);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest("[data-vault-actions]")) return;
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
      if (!(event.target instanceof Element && event.target.closest("[data-vault-chevron]"))) setVaultMenu(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (vaultMenu) { setVaultMenu(null); setMainIconPrompt(null); }
      else if (selected) setSelected(null);
      else if (customToRun) setCustomToRun(null);
      else if (view === "macro" && macroMode !== "home") setMacroMode("home");
      else setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [customToRun, macroMode, selected, vaultMenu, view]);

  async function refreshNotes() { try { setNotes(await api<Note[]>("/api/v1/notes")); } catch { setNotes([]); } }
  function showView(next: View) { readLocalData(); setView(next); setSelected(null); setCustomToRun(null); setVaultMenu(null); setMainIconPrompt(null); setMainTooltip(null); setError(""); setNotice(""); if (next === "macro") setMacroMode("home"); if (next === "vault") { setVaultRecent(false); setVaultCategory("All"); } if (next === "macro" || next === "vault") void refreshNotes(); }
  function close() { setOpen(false); setView("main"); setSelected(null); setCustomToRun(null); setVaultMenu(null); setMainIconPrompt(null); setMainTooltip(null); setError(""); }
  function showMainTooltip(button: HTMLButtonElement, label: string) { const rect = button.getBoundingClientRect(); const width = Math.min(190, Math.max(72, label.length * 6 + 16)); setMainTooltip({ label, left: Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8)), top: Math.max(8, rect.top - 31) }); }
  function savePresets(next: AOMacroPreset[]) { setPresets(next); localStorage.setItem(AO_MACROS_KEY, JSON.stringify(next)); }
  function presetById(presetId?: string) { return presets.find((item) => item.id === presetId); }
  function touchPreset(presetId: string) { const next = presets.map((item) => item.id === presetId ? { ...item, lastUsedAt: new Date().toISOString() } : item); savePresets(next); return next.find((item) => item.id === presetId); }
  function isTextPreset(preset: AOMacroPreset) { return !preset.macroId && !preset.steps?.length; }
  function launchPreset(preset: AOMacroPreset) {
    setVaultMenu(null);
    if (preset.steps?.length) { setView("vault"); setCustomToRun(preset); }
    else if (preset.macroId) { const macro = AO_MACRO_CATALOG.find((item) => item.id === preset.macroId); if (macro) { setView("macro"); setMacroMode("home"); beginMacro(macro); } }
    else { setView("macro"); setMacroMode("home"); beginMacro(AO_MACRO_CATALOG.find((item) => item.id === "vault-run")!, { presetId: preset.id }); }
  }
  function chooseMainIcon(preset: AOMacroPreset, icon: string) {
    const currentMain = presets.filter((item) => item.main); if (!preset.main && currentMain.length >= MAIN_MACRO_LIMIT) return;
    const nextOrder = currentMain.reduce((highest, item) => Math.max(highest, item.mainOrder ?? 0), -1) + 1;
    savePresets(presets.map((item) => item.id === preset.id ? { ...item, main: true, mainOrder: item.main ? item.mainOrder : nextOrder, icon } : item));
    setNotice(`${preset.label} added to Main Macro.`); setMainIconPrompt(null); setVaultMenu(null);
  }
  function toggleMainPreset(preset: AOMacroPreset) {
    const currentMain = presets.filter((item) => item.main);
    if (!preset.main && currentMain.length >= MAIN_MACRO_LIMIT) { setNotice(`Main Macro is limited to ${MAIN_MACRO_LIMIT} shortcuts.`); setVaultMenu(null); return; }
    if (!preset.main) { setMainIconPrompt(preset.id); return; }
    savePresets(presets.map((item) => item.id === preset.id ? { ...item, main: false, mainOrder: undefined, icon: undefined } : item));
    setNotice(`${preset.label} removed from Main Macro.`); setVaultMenu(null); setMainIconPrompt(null);
  }
  function deleteVaultPreset(preset: AOMacroPreset) { savePresets(presets.filter((item) => item.id !== preset.id)); setNotice(`${preset.label} deleted.`); setVaultMenu(null); }
  function reorderMainPreset(sourceId: string, targetId: string) {
    const ordered = presets.filter((item) => item.main).sort((a, b) => (a.mainOrder ?? 0) - (b.mainOrder ?? 0)); const from = ordered.findIndex((item) => item.id === sourceId); const to = ordered.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0 || from === to) return; const [moved] = ordered.splice(from, 1); ordered.splice(to, 0, moved!); const order = new Map(ordered.map((item, index) => [item.id, index])); savePresets(presets.map((item) => order.has(item.id) ? { ...item, mainOrder: order.get(item.id) } : item));
  }

  function sendTableCommand(command: AOTableCommand) {
    localStorage.setItem(AO_TABLE_COMMAND_KEY, JSON.stringify(command));
    if (pathname === "/tables") window.dispatchEvent(new Event(AO_TABLE_COMMAND_EVENT)); else router.push("/tables");
    close();
  }
  function sendTodoCommand(command: AOTodoCommand) {
    localStorage.setItem(AO_TODO_COMMAND_KEY, JSON.stringify(command));
    if (pathname === "/todo") window.dispatchEvent(new Event(AO_TODO_COMMAND_EVENT)); else router.push("/todo");
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

  function optionsFor(field: AOMacroField, context = values, macro = selected): Option[] {
    const pageTableId = context.page?.split(":")[0];
    const selectedTable = tables.find((item) => item.id === (context.tableId || pageTableId)) ?? tables[0];
    if (field.type === "table") return tables.map((item) => ({ value: item.id, label: item.name }));
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
  function requiredReady() { return (selected?.fields ?? []).every((field) => field.optional || Boolean(valueFor(field.key))); }

  function tableCommandFor(macro: AOMacroDefinition, context: Record<string, string>): AOTableCommand {
    const get = (key: string) => context[key]?.trim() ?? ""; const chosen = presetById(get("presetId"));
    return { action: macro.action, tableId: get("tableId"), columnId: get("columnId"), rowId: get("rowId"), destinationRowId: get("destinationRowId"), name: get("name"), title: get("title"), text: chosen?.text ?? get("text"), type: macro.value ?? get("type"), template: macro.value, query: get("query"), count: Number(get("count")) || undefined, page: get("page") };
  }
  function todoCommandFor(macro: AOMacroDefinition, context: Record<string, string>): AOTodoCommand {
    return { action: macro.action, title: context.title?.trim(), taskTitle: context.taskTitle?.trim(), description: context.description?.trim(), subtaskTitle: context.subtaskTitle?.trim(), subtaskDescription: context.subtaskDescription?.trim(), dueDate: context.dueDate?.trim() };
  }
  function saveBuiltIn(macro: AOMacroDefinition) {
    if (presets.some((item) => item.macroId === macro.id)) { setNotice(`${macro.label} is already saved.`); return; }
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
      for (const step of entry.steps ?? []) { const macro = AO_MACRO_CATALOG.find((item) => item.id === step.macroId); if (!macro) continue; if (macro.category === "Workspace") await runWorkspace(macro, step.values); else if (macro.category === "To Do") todoCommands.push(todoCommandFor(macro, step.values)); else if (macro.category !== "Vault") commands.push(tableCommandFor(macro, step.values)); }
      touchPreset(entry.id); if (todoCommands.length && !commands.length) sendTodoCommand({ action: "todo-batch", commands: todoCommands }); else if (commands.length) { if (todoCommands.length) localStorage.setItem(AO_TODO_COMMAND_KEY, JSON.stringify({ action: "todo-batch", commands: todoCommands })); sendTableCommand({ action: "batch", commands }); } else close();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Custom macro failed."); } finally { setBusy(false); }
  }

  async function runWorkspace(macro: AOMacroDefinition, context = values) {
    const get = (key: string) => context[key]?.trim() ?? ""; const chosenPreset = presetById(get("presetId"));
    if (macro.action === "workspace-new") return createWorkspaceNote(get("title"));
    if (macro.action === "workspace-new-preset") { if (!chosenPreset) throw new Error("Choose a saved text preset."); touchPreset(chosenPreset.id); return createWorkspaceNote(get("title"), chosenPreset.text); }
    if (macro.action === "workspace-template") return createWorkspaceNote(get("title"), WORKSPACE_TEMPLATES[macro.value ?? ""] ?? "");
    if (macro.action === "workspace-open") { const found = notes.find((item) => item.title.toLowerCase() === get("noteId").toLowerCase()) ?? notes.find((item) => item.title.toLowerCase().includes(get("noteId").toLowerCase())); if (!found) throw new Error("No saved note matches that title."); return openWorkspaceNote(found); }
    if (macro.action === "workspace-duplicate") { const draft = currentDraft(); return createWorkspaceNote(get("title"), draft.body ?? ""); }
    if (macro.action === "workspace-append") { if (!chosenPreset) throw new Error("Choose a saved text preset."); touchPreset(chosenPreset.id); return updateCurrent((body) => body.trim() ? `${body.trimEnd()}\n${chosenPreset.text}` : chosenPreset.text); }
    if (macro.action === "workspace-prepend") { if (!chosenPreset) throw new Error("Choose a saved text preset."); touchPreset(chosenPreset.id); return updateCurrent((body) => body.trim() ? `${chosenPreset.text}\n${body.trimStart()}` : chosenPreset.text); }
    if (macro.action === "workspace-section") return updateCurrent((body) => `${body.trimEnd()}\n\n## ${get("title")} · ${new Date().toLocaleDateString()}`.trim());
    if (macro.action === "workspace-save-new") { const draft = currentDraft(); if (!draft.activeId && draft.body?.trim()) await api<Note>("/api/v1/notes", { method: "POST", body: JSON.stringify({ body: draft.body }) }); return createWorkspaceNote(get("title")); }
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
      else { const chosen = presetById(valueFor("presetId")); if (chosen) touchPreset(chosen.id); sendTableCommand(tableCommandFor(selected, values)); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Macro failed."); } finally { setBusy(false); }
  }

  const filteredMacros = AO_MACRO_CATALOG.filter((item) => (!category || item.category === category) && (!query || `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase())));
  const builderCatalog = AO_MACRO_CATALOG.filter((item) => item.category !== "Vault");
  function vaultType(item: AOMacroPreset) { if (isTextPreset(item)) return "Text"; if (item.steps?.length) return "Custom"; return AO_MACRO_CATALOG.find((macro) => macro.id === item.macroId)?.category ?? "Custom"; }
  const vaultItems = [...presets].filter((item) => (!vaultRecent || item.lastUsedAt) && (vaultCategory === "All" || vaultType(item) === vaultCategory) && (!vaultQuery || `${item.label} ${item.text}`.toLowerCase().includes(vaultQuery.toLowerCase()))).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.lastUsedAt ?? b.createdAt ?? "").localeCompare(a.lastUsedAt ?? a.createdAt ?? ""));
  const mainItems = presets.filter((item) => item.main).sort((a, b) => (a.mainOrder ?? 0) - (b.mainOrder ?? 0)).slice(0, MAIN_MACRO_LIMIT);
  const menuPreset = vaultMenu ? presets.find((item) => item.id === vaultMenu.id) : undefined;
  const builderReady = Boolean(builderName.trim() && builderSteps.length && builderSteps.every((step) => { const macro = AO_MACRO_CATALOG.find((item) => item.id === step.macroId); return (macro?.fields ?? []).every((field) => field.optional || Boolean(step.values[field.key]?.trim())); }));
  function goBack() { if (selected) setSelected(null); else if (customToRun) setCustomToRun(null); else if (view === "macro" && macroMode !== "home") setMacroMode("home"); else setView("main"); }
  const titles: Record<View, string> = { main: "Macro Key Menu", macro: selected?.label ?? (macroMode === "builder" ? "Create macro" : macroMode === "presets" ? "Presets" : "Macro"), route: "Route", turbo: "Turbo", vault: customToRun?.label ?? "Vault", preferences: "Preferences" };

  return <div className={styles.root} ref={rootRef}>
    {open && <section className={`${styles.panel}${view === "macro" && macroMode === "builder" ? ` ${styles.builderPanel}` : ""}`} role="dialog" aria-label="AO macro key menu">
      <header className={styles.header}>{view === "main" ? <AOLogo /> : <button type="button" className={styles.back} aria-label="Back" onClick={goBack}>←</button>}<div><strong>{titles[view]}</strong><small>AO · Akiiro Operator</small></div><button type="button" className={styles.close} aria-label="Close AO macro key menu" onClick={close}>×</button></header>
      {view === "main" && <div className={styles.list}>
        <button type="button" onClick={() => showView("macro")}><span className={styles.infoMark} tabIndex={0} aria-label="Macro information" data-tip="Search, configure and run more than 70 app shortcuts.">i</span><b>Macro</b><em>›</em></button>
        <button type="button" onClick={() => showView("route")}><span className={styles.infoMark} tabIndex={0} aria-label="Route information" data-tip="Jump directly to a destination in Work Sync.">i</span><b>Route</b><em>›</em></button>
        <button type="button" onClick={() => showView("turbo")}><span className={styles.infoMark} tabIndex={0} aria-label="Turbo information" data-tip="Send written input to Workspace or a new table.">i</span><b>Turbo</b><em>›</em></button>
        <button type="button" onClick={() => showView("vault")}><VaultIcon info /><b>Vault</b><em>›</em></button>
        <hr /><button type="button" onClick={() => showView("preferences")}><span>⚙</span><b>Preferences</b><em>›</em></button>
      </div>}
      {view === "macro" && !selected && macroMode === "home" && <div className={styles.list}>
        {notice && <p className={styles.notice}>{notice}</p>}
        <button type="button" onClick={() => setMacroMode("presets")}><span className={styles.infoMark} tabIndex={0} aria-label="Presets information" data-tip="Browse, configure and save built-in app shortcuts.">i</span><b>Presets</b><em>›</em></button>
        <button type="button" onClick={() => beginMacro(AO_MACRO_CATALOG.find((item) => item.id === "vault-create")!)}><span className={styles.infoMark} tabIndex={0} aria-label="Text preset information" data-tip="Save reusable text in Vault for notes, pages and macros.">i</span><b>Create text preset</b><em>›</em></button>
        <button type="button" onClick={() => { setBuilderName(""); setBuilderSteps([]); setMacroMode("builder"); }}><VaultIcon /><b>Create macro</b><em>›</em></button>
        <hr /><button type="button" onClick={() => showView("vault")}><VaultIcon /><b>Open Vault</b><em>›</em></button>
      </div>}
      {view === "macro" && !selected && macroMode === "presets" && <div className={styles.macroBrowser}>
        <label className={styles.search}><span>⌕</span><input aria-label="Search macros" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${AO_MACRO_CATALOG.length} presets…`} /></label>
        <div className={styles.categories}>{AO_MACRO_CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? styles.active : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
        {notice && <p className={styles.notice}>{notice}</p>}<div className={styles.macroResults}>{filteredMacros.map((macro) => <div className={styles.macroResultRow} key={macro.id}><button type="button" onClick={() => beginMacro(macro)}><span>{macro.label}</span><small>{macro.description}</small><em>›</em></button><button type="button" className={styles.savePreset} onClick={() => saveBuiltIn(macro)}>{presets.some((item) => item.macroId === macro.id) ? "Saved" : "Save"}</button></div>)}</div>
      </div>}
      {view === "macro" && !selected && macroMode === "builder" && <div className={styles.builder}>
        <label>Macro name<input value={builderName} onChange={(event) => setBuilderName(event.target.value)} placeholder="My workflow" /></label>
        <div className={styles.builderAdd}><select aria-label="Preset element" value={builderChoice} onChange={(event) => setBuilderChoice(event.target.value)}>{AO_MACRO_CATEGORIES.filter((item) => item !== "Vault").map((item) => <optgroup key={item} label={item}>{builderCatalog.filter((macro) => macro.category === item).map((macro) => <option key={macro.id} value={macro.id}>{macro.label}</option>)}</optgroup>)}</select><button type="button" onClick={addBuilderStep}>Add step</button></div>
        <div className={styles.builderSteps}>{builderSteps.length ? builderSteps.map((step, index) => { const macro = AO_MACRO_CATALOG.find((item) => item.id === step.macroId)!; return <section key={step.id}><header><span>{index + 1}</span><strong>{macro.label}</strong><button type="button" aria-label={`Remove ${macro.label}`} onClick={() => setBuilderSteps((current) => current.filter((item) => item.id !== step.id))}>×</button></header>{(macro.fields ?? []).map((field) => { const options = optionsFor(field, step.values, macro); const isSelect = options.length || ["table", "column", "column-type", "row", "page-column", "page", "preset", "destination"].includes(field.type); const update = (value: string) => setBuilderSteps((current) => current.map((item) => item.id === step.id ? { ...item, values: { ...item.values, [field.key]: value, ...(field.type === "table" ? { columnId: "", rowId: "" } : {}) } } : item)); return <label key={`${step.id}-${field.key}`}>{field.label}{isSelect ? <select value={step.values[field.key] ?? ""} onChange={(event) => update(event.target.value)}><option value="">Choose…</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "textarea" ? <textarea value={step.values[field.key] ?? ""} onChange={(event) => update(event.target.value)} placeholder={field.placeholder} /> : <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={step.values[field.key] ?? ""} onChange={(event) => update(event.target.value)} placeholder={field.placeholder} />}</label>; })}</section>; }) : <p>Add built-in preset elements to create a reusable sequence.</p>}</div>
        {error && <p className={styles.error}>{error}</p>}<button type="button" className={styles.builderSave} disabled={!builderReady} onClick={saveCustomMacro}>Save macro to Vault</button>
      </div>}
      {view === "macro" && selected && <form className={styles.runner} onSubmit={(event) => { event.preventDefault(); void runSelected(); }}><p>{selected.description}</p>{(selected.fields ?? []).map((field) => { const options = optionsFor(field); const isSelect = options.length || ["table", "column", "column-type", "row", "page-column", "page", "preset", "destination"].includes(field.type); return <label key={`${field.key}-${field.type}`}>{field.label}{isSelect ? <select value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value, ...(field.type === "table" ? { columnId: "", rowId: "" } : {}) }))}><option value="">Choose…</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "textarea" ? <textarea value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} /> : <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} min={field.type === "number" ? 1 : undefined} max={field.type === "number" ? 100 : undefined} value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} />}</label>; })}{selected.action === "vault-run" && valueFor("destination") === "page" && <label>Page<select value={values.page ?? ""} onChange={(event) => setValues((current) => ({ ...current, page: event.target.value }))}><option value="">Choose…</option>{optionsFor({ key: "page", label: "Page", type: "page" }).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}{error && <p className={styles.error}>{error}</p>}<button type="submit" disabled={busy || !requiredReady()}>{busy ? "Running…" : "Run macro"}</button></form>}
      {view === "route" && <div className={styles.list}><p className={styles.hint}>Open a destination in this app.</p>{ROUTES.map(([label, href, icon]) => <button type="button" key={href} className={pathname === href ? styles.active : ""} onClick={() => { router.push(href); close(); }}><span>{icon}</span><b>{label}</b>{pathname === href && <em>Current</em>}</button>)}</div>}
      {view === "turbo" && <form className={styles.form} onSubmit={(event) => { event.preventDefault(); sendWorkspaceText(turboText); }}><label>Input prompt<textarea value={turboText} onChange={(event) => setTurboText(event.target.value)} placeholder="Write content for a destination…" autoFocus /></label><div className={styles.actions}><button type="submit" disabled={!turboText.trim()}>Write in Workspace</button><button type="button" disabled={!turboText.trim()} onClick={() => sendTableCommand({ action: "add-table", text: turboText })}>Make a new table</button></div></form>}
      {view === "vault" && customToRun && <div className={styles.customRun}><p>Run this saved sequence:</p><ol>{(customToRun.steps ?? []).map((step) => <li key={`${customToRun.id}-${step.macroId}`}>{AO_MACRO_CATALOG.find((item) => item.id === step.macroId)?.label ?? "Unavailable step"}</li>)}</ol>{error && <p className={styles.error}>{error}</p>}<button type="button" disabled={busy} onClick={() => void runCustomMacro(customToRun)}>{busy ? "Running…" : "Run custom macro"}</button></div>}
      {view === "vault" && !customToRun && <div className={styles.vault}>
        <label className={styles.search}><span>⌕</span><input aria-label="Search Vault" value={vaultQuery} onChange={(event) => setVaultQuery(event.target.value)} placeholder="Search saved macros…" /></label>
        <div className={styles.vaultMainHeader}><strong>Main Macro</strong><span>{mainItems.length}/{MAIN_MACRO_LIMIT}</span></div>
        {mainItems.length ? <div className={styles.mainMacros} aria-label="Main Macro shortcuts">{mainItems.map((preset) => <button type="button" key={preset.id} draggable onMouseEnter={(event) => showMainTooltip(event.currentTarget, preset.label)} onMouseLeave={() => setMainTooltip(null)} onFocus={(event) => showMainTooltip(event.currentTarget, preset.label)} onBlur={() => setMainTooltip(null)} onDragStart={(event) => { setMainTooltip(null); event.dataTransfer.setData("text/main-macro", preset.id); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const source = event.dataTransfer.getData("text/main-macro"); if (source) reorderMainPreset(source, preset.id); }} onClick={() => launchPreset(preset)} aria-label={`Run ${preset.label}`}><span>{preset.icon}</span></button>)}</div> : <p className={styles.mainEmpty}>Choose up to five shortcuts from Vault.</p>}
        <div className={styles.categories}>{VAULT_CATEGORIES.map((item) => <button type="button" key={item} className={vaultCategory === item ? styles.active : ""} onClick={() => setVaultCategory(item)}>{item}</button>)}</div>
        {vaultRecent && <p className={styles.notice}>Recently used macros</p>}{notice && <p className={styles.notice}>{notice}</p>}
        <button type="button" className={styles.createPreset} onClick={() => { setView("macro"); setMacroMode("home"); beginMacro(AO_MACRO_CATALOG.find((item) => item.id === "vault-create")!); }}>＋ Create text preset</button>
        {vaultItems.length ? <div className={styles.vaultItems}>{vaultItems.map((preset) => <div className={styles.vaultItem} key={preset.id}><span>{preset.pinned ? "◇" : ""}</span><button type="button" onClick={() => launchPreset(preset)}><strong>{preset.label}</strong><small>{preset.steps?.length ? `${preset.steps.length} step custom macro` : preset.macroId ? `Saved ${vaultType(preset)} preset` : preset.text}</small></button><div className={styles.vaultTail}><span title={isTextPreset(preset) ? "Text preset" : "Macro"}>{isTextPreset(preset) ? "T" : "M"}</span><button type="button" data-vault-chevron aria-label={`Options for ${preset.label}`} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const width = 218; setMainIconPrompt(null); setVaultMenu(vaultMenu?.id === preset.id ? null : { id: preset.id, left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 210)) }); }}>›</button></div></div>)}</div> : <p className={styles.empty}>{vaultRecent ? "No recently used macros." : "No saved macros match this category."}</p>}
      </div>}
      {menuPreset && vaultMenu && createPortal(<div className={styles.vaultActions} style={{ left: vaultMenu.left, top: vaultMenu.top }} role="menu" aria-label={`Manage ${menuPreset.label}`} data-vault-actions>
        {mainIconPrompt === menuPreset.id && <><p>Choose a shortcut icon</p><div className={styles.mainIconGrid}>{MAIN_MACRO_ICONS.map((icon) => <button type="button" key={icon} aria-label={`Use ${icon} for ${menuPreset.label}`} onClick={() => chooseMainIcon(menuPreset, icon)}>{icon}</button>)}</div></>}
        {mainIconPrompt !== menuPreset.id && <button type="button" onClick={() => toggleMainPreset(menuPreset)}><span>＋</span>{menuPreset.main ? "Remove from Main Macro" : "Add to Main Macro"}</button>}
        <hr /><button type="button" className={styles.danger} onClick={() => deleteVaultPreset(menuPreset)}><span>♜</span>Delete</button>
      </div>, document.body)}
      {mainTooltip && createPortal(<div className={styles.mainMacroTooltip} style={{ left: mainTooltip.left, top: mainTooltip.top }} role="tooltip">{mainTooltip.label}</div>, document.body)}
      {view === "preferences" && <div className={styles.preferences}><p className={styles.hint}>Text presets are now created, searched and run inside Macro and Vault.</p><button type="button" className={styles.save} onClick={() => showView("vault")}>Open Vault</button></div>}
    </section>}
    <button type="button" className={styles.trigger} aria-label="Open AO macro key menu" aria-expanded={open} onClick={() => { setOpen((current) => !current); if (open) setView("main"); }}><AOLogo /></button>
  </div>;
}
