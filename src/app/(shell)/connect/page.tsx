"use client";

import { useEffect, useMemo, useState } from "react";
import { Workspace } from "@/ui";
import { AO_MACRO_CATALOG, AO_MACRO_CATEGORIES, type AOMacroDefinition, type AOMacroField } from "@/lib/ao-catalog";
import { AO_MACROS_CHANGED_EVENT, AO_MACROS_KEY, type AOCustomMacroStep, type AOMacroPreset } from "@/lib/ao-macro";
import { TODO_STORAGE_KEY, type TodoItem } from "@/lib/todo-model";
import { decodePageCell, type WorkTable } from "@/lib/table-model";
import { api } from "@/lib/client-api";
import { userStorageKey } from "@/lib/user-storage";

type Note = { id: string; title: string };
type Option = { value: string; label: string };
type BuilderStep = AOCustomMacroStep & { id: string };
const OBJECT_FIELDS = new Set(["table", "column", "row", "page-column", "page", "preset", "note", "todo", "heading", "destination", "column-type"]);

export default function ConnectPage() {
  const [name, setName] = useState(""), [choice, setChoice] = useState(AO_MACRO_CATALOG[0]!.id), [steps, setSteps] = useState<BuilderStep[]>([]), [presets, setPresets] = useState<AOMacroPreset[]>([]), [tables, setTables] = useState<WorkTable[]>([]), [todos, setTodos] = useState<TodoItem[]>([]), [notes, setNotes] = useState<Note[]>([]), [notice, setNotice] = useState("");
  useEffect(() => { try { setPresets(JSON.parse(localStorage.getItem(userStorageKey(AO_MACROS_KEY)) ?? "[]")); setTables(JSON.parse(localStorage.getItem(userStorageKey("work-sync:tables")) ?? "[]")); setTodos(JSON.parse(localStorage.getItem(userStorageKey(TODO_STORAGE_KEY)) ?? "[]")); } catch { setPresets([]); setTables([]); setTodos([]); } void api<Note[]>("/api/v1/notes").then(setNotes).catch(() => setNotes([])); }, []);
  function optionsFor(field: AOMacroField, values: Record<string, string>, macro: AOMacroDefinition): Option[] {
    const table = tables.find((item) => item.id === values.tableId) ?? tables[0];
    if (field.type === "table") return tables.map((item) => ({ value: item.id, label: item.name }));
    if (field.type === "note") return notes.map((item) => ({ value: item.id, label: item.title }));
    if (field.type === "todo") return todos.map((item) => ({ value: item.id, label: item.title }));
    if (field.type === "column") return (table?.columns ?? []).map((item) => ({ value: item.id, label: `${item.name} · ${item.type}` }));
    if (field.type === "row") return (table?.rows ?? []).map((item, index) => ({ value: item.id, label: String(item.cells[table!.columns[0]!.id] || `Row ${index + 1}`) }));
    if (field.type === "page-column") return (table?.columns ?? []).filter((item) => item.type === "page").map((item) => ({ value: item.id, label: item.name }));
    if (field.type === "page") return tables.flatMap((item) => item.columns.filter((column) => column.type === "page").flatMap((column) => item.rows.flatMap((row, index) => { const page = decodePageCell(row.cells[column.id]); return page.title || page.body ? [{ value: `${item.id}:${row.id}:${column.id}`, label: `${page.title || "Untitled"} · ${item.name} / Row ${index + 1}` }] : []; })));
    if (field.type === "preset") return presets.map((item) => ({ value: item.id, label: item.label }));
    if (field.type === "heading") return [1, 2, 3, 4].map((item) => ({ value: `h${item}`, label: `Heading ${item}` }));
    if (field.type === "destination") return [{ value: "new-note", label: "New Workspace note" }, { value: "current-note", label: "Current Workspace note" }, { value: "new-table", label: "New table" }, { value: "page", label: "Table page" }];
    if (field.type === "column-type") return ([ ["text", "Text"], ["number", "Number"], ["date", "Date"], ["people", "People"], ["files", "Image & Files"], ["page", "Page"] ] as Array<[string, string]>).map(([value, label]) => ({ value, label }));
    return [];
  }
  function initialValues(macro: AOMacroDefinition) { const values: Record<string, string> = {}; for (const field of macro.fields ?? []) { const first = optionsFor(field, values, macro)[0]; if (first) values[field.key] = first.value; if (field.type === "number") values[field.key] = "3"; } return values; }
  function addStep() { const macro = AO_MACRO_CATALOG.find((item) => item.id === choice); if (!macro || macro.category === "Vault") return; setSteps((current) => [...current, { id: crypto.randomUUID(), macroId: macro.id, values: initialValues(macro) }]); }
  function updateStep(id: string, key: string, value: string) { setSteps((current) => current.map((step) => step.id === id ? { ...step, values: { ...step.values, [key]: value, ...(key === "tableId" ? { columnId: "", rowId: "" } : {}) } } : step)); }
  const ready = useMemo(() => Boolean(name.trim() && steps.length && steps.every((step) => { const macro = AO_MACRO_CATALOG.find((item) => item.id === step.macroId); return (macro?.fields ?? []).every((field) => field.optional || Boolean(step.values[field.key]?.trim())); })), [name, steps]);
  function save() { if (!ready) return; const next = [...presets, { id: crypto.randomUUID(), label: name.trim(), text: "", steps: steps.map(({ macroId, values }) => ({ macroId, values })), createdAt: new Date().toISOString() }]; setPresets(next); localStorage.setItem(userStorageKey(AO_MACROS_KEY), JSON.stringify(next)); window.dispatchEvent(new Event(AO_MACROS_CHANGED_EVENT)); setName(""); setSteps([]); setNotice("Macro saved to Vault."); }
  return <Workspace title="Create Macro" subtitle="Build a reusable, object-aware workflow"><section className="ms-panel ms-create-macro"><label>Macro name<input aria-label="Macro name" value={name} onChange={(event) => setName(event.target.value)} placeholder="My workflow" /></label><div className="ms-create-macro-add"><label>Preset action<select aria-label="Preset action" value={choice} onChange={(event) => setChoice(event.target.value)}>{AO_MACRO_CATEGORIES.filter((category) => category !== "Vault").map((category) => <optgroup key={category} label={category}>{AO_MACRO_CATALOG.filter((macro) => macro.category === category).map((macro) => <option key={macro.id} value={macro.id}>{macro.label}</option>)}</optgroup>)}</select></label><button type="button" className="ms-btn" onClick={addStep}>Add step</button></div><div className="ms-create-macro-steps">{steps.map((step, index) => { const macro = AO_MACRO_CATALOG.find((item) => item.id === step.macroId)!; return <section key={step.id}><header><span>{index + 1}</span><strong>{macro.label}</strong><button type="button" aria-label={`Remove ${macro.label}`} onClick={() => setSteps((current) => current.filter((item) => item.id !== step.id))}>×</button></header><p>{macro.description}</p><div>{(macro.fields ?? []).map((field) => { const options = optionsFor(field, step.values, macro); const isObject = OBJECT_FIELDS.has(field.type); return <label key={field.key}>{field.label}{isObject ? <select aria-label={`${field.label} for ${macro.label}`} value={step.values[field.key] ?? ""} onChange={(event) => updateStep(step.id, field.key, event.target.value)}><option value="">Choose an existing object…</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "textarea" ? <textarea value={step.values[field.key] ?? ""} onChange={(event) => updateStep(step.id, field.key, event.target.value)} placeholder={field.placeholder} /> : <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={step.values[field.key] ?? ""} onChange={(event) => updateStep(step.id, field.key, event.target.value)} placeholder={field.placeholder} />}</label>; })}</div></section>; })}{!steps.length && <p className="ms-muted">Add preset actions to build your macro. Existing Workspace Notes, To Dos, tables, rows, pages, and Vault entries are always selected from dropdowns.</p>}</div>{notice && <p className="ms-muted">{notice}</p>}<button type="button" className="ms-btn ms-btn-primary" disabled={!ready} onClick={save}>Save macro to Vault</button></section></Workspace>;
}
