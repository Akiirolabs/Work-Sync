import {
  TYPE_INFO, addColumn, addRow, changeColumnType, decodePageCell, duplicateColumn,
  duplicateTable, encodePageCell, hideColumn, insertColumn, makeTable, showColumn,
  updateCell, type ColumnType, type WorkTable,
} from "./table-model.ts";
import { wrapExternalValue } from "./text-layout.ts";

export const AO_MACROS_KEY = "work-sync:ao-macros";
export const AO_TABLE_COMMAND_KEY = "work-sync:ao-table-command";
export const AO_WORKSPACE_TEXT_KEY = "work-sync:ao-workspace-text";
export const AO_WORKSPACE_OPEN_KEY = "work-sync:ao-workspace-open";
export const AO_WORKSPACE_LINE_COMMAND_KEY = "work-sync:ao-workspace-line-command";
export const AO_TABLE_COMMAND_EVENT = "work-sync:ao-table-command";
export const AO_WORKSPACE_TEXT_EVENT = "work-sync:ao-workspace-text";
export const AO_WORKSPACE_OPEN_EVENT = "work-sync:ao-workspace-open";
export const AO_WORKSPACE_LINE_COMMAND_EVENT = "work-sync:ao-workspace-line-command";
export const AO_MACROS_CHANGED_EVENT = "work-sync:ao-macros-changed";
export const AO_RUN_MAIN_MACRO_EVENT = "work-sync:run-main-macro";
export const AO_OPEN_MACRO_MENU_EVENT = "work-sync:open-macro-menu";

export type AOTableCommand = { action: string; tableId?: string; columnId?: string; rowId?: string; destinationRowId?: string; name?: string; title?: string; text?: string; type?: string; template?: string; query?: string; count?: number; page?: string; commands?: AOTableCommand[] };
export type AOWorkspaceLineCommand = { action: "add-text" | "add-comment" | "add-heading" | "add-code"; text: string; kind?: "h1" | "h2" | "h3" | "h4" };
export type AOCustomMacroStep = { macroId: string; values: Record<string, string> };
export type AOMacroPreset = { id: string; label: string; text: string; macroId?: string; steps?: AOCustomMacroStep[]; pinned?: boolean; createdAt?: string; lastUsedAt?: string; main?: boolean; mainOrder?: number; icon?: string };
export type AOTableMacroResult = { tables: WorkTable[]; activeId: string; openPage?: { rowId: string; columnId: string }; openColumn?: string; focusCell?: { rowId: string; columnId: string }; filter?: { columnId: string; query: string }; summary?: string };

export function saveMacroPretext(entries: AOMacroPreset[], label: string): AOMacroPreset[] {
  const text = label.trim(); if (!text || entries.some((item) => !item.macroId && !item.steps?.length && item.text === text)) return entries;
  return [...entries, { id: crypto.randomUUID(), label: text, text, createdAt: new Date().toISOString() }];
}

const id = () => crypto.randomUUID();
const safeType = (value?: string): ColumnType => value && value in TYPE_INFO ? value as ColumnType : "text";
const pageParts = (value?: string) => { const [tableId = "", rowId = "", columnId = ""] = (value ?? "").split(":"); return { tableId, rowId, columnId }; };
const TEMPLATE_COLUMNS: Record<string, Array<[string, ColumnType]>> = {
  project: [["Project", "text"], ["Status", "single"], ["Owner", "people"], ["Due Date", "date"], ["Priority", "single"], ["Project Page", "page"]],
  meeting: [["Topic", "text"], ["Date", "date"], ["Attendees", "people"], ["Meeting Page", "page"], ["Follow-up", "checkbox"]],
  lab: [["Experiment", "text"], ["Researcher", "people"], ["Date", "date"], ["Result", "text"], ["Files", "files"], ["Lab Page", "page"]],
  content: [["Title", "text"], ["Platform", "single"], ["Status", "single"], ["Publish Date", "date"], ["Owner", "people"], ["Content Page", "page"]],
  issues: [["Issue", "text"], ["Severity", "single"], ["Assignee", "people"], ["Status", "single"], ["Date", "date"], ["Investigation Page", "page"]],
};

function newTable(number: number, name?: string, template?: string): WorkTable {
  const next = makeTable(number); const schema = template ? TEMPLATE_COLUMNS[template] : undefined;
  return { ...next, name: name?.trim() || next.name, columns: schema ? schema.map(([columnName, type]) => ({ id: id(), name: columnName, type })) : next.columns };
}

export function applyTableMacro(tables: WorkTable[], activeId: string, command: AOTableCommand): AOTableMacroResult {
  if (command.action === "batch") {
    return (command.commands ?? []).reduce<AOTableMacroResult>((result, next) => {
      const applied = applyTableMacro(result.tables, result.activeId, next);
      return { ...applied, openPage: applied.openPage ?? result.openPage, openColumn: applied.openColumn ?? result.openColumn, focusCell: applied.focusCell ?? result.focusCell, filter: applied.filter ?? result.filter, summary: applied.summary ?? result.summary };
    }, { tables, activeId });
  }
  if (["add-table", "table-create", "table-template"].includes(command.action)) {
    let next = newTable(tables.length + 1, command.name, command.template);
    if (command.action === "add-table" && command.text?.trim()) { next = { ...next, name: "Turbo" }; next = updateCell(next, next.rows[0]!.id, next.columns[0]!.id, command.text.trim()); }
    return { tables: [...tables, next], activeId: next.id };
  }
  const requestedId = command.tableId || (command.page ? pageParts(command.page).tableId : "");
  const selectedId = tables.some((item) => item.id === requestedId) ? requestedId : tables.some((item) => item.id === activeId) ? activeId : tables[0]?.id;
  if (!selectedId) return { tables, activeId };
  const selected = tables.find((item) => item.id === selectedId)!;
  if (command.action === "table-open") return { tables, activeId: selectedId };
  if (command.action === "table-rename") return { tables: tables.map((item) => item.id === selectedId ? { ...item, name: command.name?.trim() || item.name } : item), activeId: selectedId };
  if (command.action === "table-duplicate") { const copy = duplicateTable(selected, command.name?.trim() || `${selected.name} copy`); return { tables: [...tables, copy], activeId: copy.id }; }

  let updated = selected; let openPage: AOTableMacroResult["openPage"]; let openColumn: string | undefined; let focusCell: AOTableMacroResult["focusCell"]; let filter: AOTableMacroResult["filter"]; let summary: string | undefined;
  if (["add-row", "row-add"].includes(command.action)) updated = addRow(updated);
  if (command.action === "row-many") for (let index = 0; index < Math.min(100, Math.max(1, Number(command.count) || 1)); index += 1) updated = addRow(updated);
  if (["row-named", "row-preset"].includes(command.action)) { updated = addRow(updated); const nextRow = updated.rows.at(-1)!; updated = updateCell(updated, nextRow.id, updated.columns[0]!.id, command.name?.trim() || command.text?.trim() || "New record"); }
  if (command.action === "row-duplicate") { const source = updated.rows.find((item) => item.id === command.rowId); if (source) updated = { ...updated, rows: [...updated.rows, { id: id(), cells: { ...source.cells } }] }; }
  if (["row-page", "page-create"].includes(command.action)) {
    let targetRowId = command.rowId;
    if (command.action === "row-page") { updated = addRow(updated); targetRowId = updated.rows.at(-1)!.id; if (command.name?.trim()) updated = updateCell(updated, targetRowId, updated.columns[0]!.id, command.name.trim()); }
    if (command.columnId === "__new_page__") { updated = addColumn(updated, "page"); command = { ...command, columnId: updated.columns.at(-1)!.id }; }
    const pageCol = updated.columns.find((item) => item.id === command.columnId && item.type === "page");
    if (targetRowId && pageCol) { updated = updateCell(updated, targetRowId, pageCol.id, encodePageCell(command.title?.trim() || "Untitled page", "")); openPage = { rowId: targetRowId, columnId: pageCol.id }; }
  }
  if (command.action === "row-empty") { const empty = updated.rows.find((item) => !String(item.cells[command.columnId ?? ""] ?? "").trim()); if (empty && command.columnId) focusCell = { rowId: empty.id, columnId: command.columnId }; }
  if (["add-column", "column-add"].includes(command.action)) { updated = addColumn(updated, safeType(command.type)); const created = updated.columns.at(-1)!; if (command.name?.trim()) updated = { ...updated, columns: updated.columns.map((item) => item.id === created.id ? { ...item, name: command.name!.trim() } : item) }; }
  if (command.action === "column-rename") updated = { ...updated, columns: updated.columns.map((item) => item.id === command.columnId ? { ...item, name: command.name?.trim() || item.name } : item) };
  if (command.action === "column-duplicate" && command.columnId) updated = duplicateColumn(updated, command.columnId);
  if (command.action === "column-change" && command.columnId) updated = changeColumnType(updated, command.columnId, safeType(command.type));
  if (command.action === "column-insert-left" && command.columnId) updated = insertColumn(updated, command.columnId, "left");
  if (command.action === "column-insert-right" && command.columnId) updated = insertColumn(updated, command.columnId, "right");
  if (command.action === "column-hide" && command.columnId) updated = hideColumn(updated, command.columnId);
  if (command.action === "column-show" && command.columnId) updated = showColumn(updated, command.columnId);
  if (command.action === "column-options" && command.columnId) openColumn = command.columnId;
  if (command.action === "column-summary" && command.columnId) summary = command.columnId;
  if (command.action === "column-filter" && command.columnId) filter = { columnId: command.columnId, query: command.query ?? "" };
  if (command.action === "page-column-first") { updated = addColumn(updated, "page"); const created = updated.columns.at(-1)!; if (command.name?.trim()) updated = { ...updated, columns: updated.columns.map((item) => item.id === created.id ? { ...item, name: command.name!.trim() } : item) }; const firstRow = updated.rows[0]!; updated = updateCell(updated, firstRow.id, created.id, encodePageCell(command.title?.trim() || "Untitled page", "")); openPage = { rowId: firstRow.id, columnId: created.id }; }
  if (["page-open", "page-rename", "page-append", "page-duplicate"].includes(command.action)) {
    const selectedPage = pageParts(command.page); const sourceRow = updated.rows.find((item) => item.id === selectedPage.rowId); const sourceColumn = updated.columns.find((item) => item.id === selectedPage.columnId && item.type === "page");
    if (sourceRow && sourceColumn) { const document = decodePageCell(sourceRow.cells[sourceColumn.id]); if (command.action === "page-open") openPage = { rowId: sourceRow.id, columnId: sourceColumn.id }; if (command.action === "page-rename") updated = updateCell(updated, sourceRow.id, sourceColumn.id, encodePageCell(command.title?.trim() || document.title, document.body)); if (command.action === "page-append") { const generated = wrapExternalValue(command.text?.trim() ?? ""); updated = updateCell(updated, sourceRow.id, sourceColumn.id, encodePageCell(document.title, document.body.trim() ? `${document.body.trimEnd()}\n${generated}` : generated)); } if (command.action === "page-duplicate" && command.destinationRowId) updated = updateCell(updated, command.destinationRowId, sourceColumn.id, encodePageCell(`${document.title} copy`, document.body)); }
  }
  if (command.action === "page-fill-empty" && command.columnId) { let count = 1; updated = { ...updated, rows: updated.rows.map((item) => { if (String(item.cells[command.columnId!] ?? "").trim()) return item; return { ...item, cells: { ...item.cells, [command.columnId!]: encodePageCell(`${command.title?.trim() || "Page"} ${count++}`, "") } }; }) }; }
  return { tables: tables.map((item) => item.id === selectedId ? updated : item), activeId: selectedId, openPage, openColumn, focusCell, filter, summary };
}
