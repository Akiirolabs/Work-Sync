"use client";

import { useEffect, useMemo, useState, type CSSProperties, type DragEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { TABLE_ICON_GROUPS, TYPE_INFO, addColumn as addColumnModel, addRow as addRowModel, changeColumnType, decodePageCell, deleteColumn, duplicateColumn, duplicateTable, encodePageCell, hideColumn, insertColumn, makeTable, moveColumn, normalizeTableIcon, setColumnOptions, showColumn, updateCell as updateCellModel, type Column, type ColumnType, type Row, type SelectOption, type WorkTable } from "@/lib/table-model";
import { LineEditor } from "@/components/LineEditor";
import { AO_MACROS_KEY, AO_TABLE_COMMAND_EVENT, AO_TABLE_COMMAND_KEY, applyTableMacro, saveMacroPretext, type AOMacroPreset, type AOTableCommand } from "@/lib/ao-macro";
import { userStorageKey } from "@/lib/user-storage";
const STORAGE_KEY = "work-sync:tables";
const SELECT_COLORS = ["#285fba", "#795b0a", "#087443", "#a62f24", "#59349c", "#247c82", "#a74c1f", "#941f59", "#334155", "#25755f", "#8a3d68", "#7c641e", "#b33a31", "#216fa8", "#3d895d", "#a35e22", "#514773", "#5d6066"];

type TableIconName = "people" | "date" | "files" | "filter" | "group" | "appearance" | "settings" | "comments" | "edit" | "duplicate" | "summarize" | "freeze" | "delete" | "clipboard" | "search";
function TableIcon({ name }: { name: TableIconName }) {
  const paths: Record<TableIconName, React.ReactNode> = {
    people: <><circle cx="9" cy="8" r="3" /><circle cx="16" cy="9" r="2.4" /><path d="M3.5 19c.5-4 2.4-6 5.5-6s5 2 5.5 6M14 14c3.5-.4 5.5 1.3 6 4.5" /></>,
    date: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 17h2" /></>,
    files: <><rect x="3.5" y="5" width="13" height="14" rx="2" /><path d="m5.5 16 3.2-3.4 2.5 2.3 2-2 3.3 3.1M15 3h3.5A2.5 2.5 0 0 1 21 5.5V16" /><circle cx="8" cy="9" r="1.2" /></>,
    filter: <path d="M3.5 5h17l-6.7 7.3v5.2l-3.6 1.8v-7z" />,
    group: <><rect x="3.5" y="4" width="7" height="6" rx="1.3" /><rect x="13.5" y="4" width="7" height="6" rx="1.3" /><rect x="8.5" y="15" width="7" height="5" rx="1.3" /><path d="M7 10v2h10v-2M12 12v3" /></>,
    appearance: <><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.5 0 2.2-.8 1.7-2-.5-1.2.2-2.2 1.7-2.2h1.3c2.4 0 3.8-1.7 3.8-4.2A8.5 8.5 0 0 0 12 3.5Z" /><circle cx="8" cy="9" r="1" /><circle cx="12" cy="7" r="1" /><circle cx="16" cy="9" r="1" /><circle cx="7" cy="13" r="1" /></>,
    settings: <><path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.6a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.6a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z" /><circle cx="12" cy="12" r="3" /></>,
    comments: <path d="M4 5.5h16v11H10l-5 3v-3H4z" />,
    edit: <><path d="m4 20 4.1-.9L19 8.2a2.2 2.2 0 0 0-3.1-3.1L5 16l-1 4Z" /><path d="m13.8 6.2 4 4" /></>,
    duplicate: <><rect x="8" y="8" width="11" height="12" rx="1.8" /><path d="M16 8V5.8A1.8 1.8 0 0 0 14.2 4H6.8A1.8 1.8 0 0 0 5 5.8v9.4A1.8 1.8 0 0 0 6.8 17H8" /></>,
    summarize: <><path d="M5 5h14M5 12h9M5 19h14" /><path d="m16 9 3 3-3 3" /></>,
    freeze: <><path d="M12 3v18M5 7h14M5 17h14" /><path d="m8 4 4-2 4 2M8 20l4 2 4-2" /></>,
    delete: <><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>,
    clipboard: <><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5V3h6v2M9 11h6M9 15h5" /></>,
    search: <><circle cx="10.5" cy="10.5" r="5.8" /><path d="m15 15 4.5 4.5" /></>,
  };
  return <svg className="ms-ui-icon" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
function PropertyIcon({ type }: { type: ColumnType }) { return type === "people" || type === "date" || type === "files" ? <TableIcon name={type} /> : <>{TYPE_INFO[type].icon}</>; }

function selectedLabels(value: string | boolean | undefined, multiple: boolean): string[] {
  const raw = typeof value === "string" ? value : ""; if (!raw) return [];
  if (!multiple) return [raw];
  try { const parsed = JSON.parse(raw) as unknown; return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [raw]; } catch { return raw.split(",").map((item) => item.trim()).filter(Boolean); }
}
function encodeSelected(labels: string[], multiple: boolean) { return multiple ? JSON.stringify(labels) : labels[0] ?? ""; }

function Cell({ row, column, onChange, onEnter, onOpenPage, onOpenSelect }: { row: Row; column: Column; onChange: (value: string | boolean) => void; onEnter: () => void; onOpenPage: () => void; onOpenSelect: (target: HTMLButtonElement) => void }) {
  const value = row.cells[column.id] ?? "";
  if (column.type === "checkbox") return <label className="ms-grid-check"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /><span /></label>;
  const enter = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") { event.preventDefault(); onEnter(); } };
  if (column.type === "date") return <input type="date" value={String(value)} onChange={(e) => onChange(e.target.value)} onKeyDown={enter} />;
  if (column.type === "single" || column.type === "multiple") { const labels = selectedLabels(value, column.type === "multiple"); return <button type="button" className="ms-select-cell" onClick={(event) => onOpenSelect(event.currentTarget)}>{labels.length ? labels.map((label) => { const option = column.options?.find((item) => item.label === label); return <span key={label} style={{ "--select-color": option?.color ?? SELECT_COLORS[8] } as CSSProperties}>{label}</span>; }) : <em>Select…</em>}</button>; }
  if (column.type === "people") return <input value={String(value)} onChange={(e) => onChange(e.target.value)} onKeyDown={enter} placeholder="Empty" />;
  if (column.type === "files") return <button className="ms-cell-upload" type="button">+ Add file</button>;
  if (column.type === "page") { const page = decodePageCell(value); return <button className="ms-page-cell" type="button" onClick={onOpenPage}><span>▤</span>{page.title || "Open page"}</button>; }
  return <input type={column.type === "number" || column.type === "currency" || column.type === "percent" ? "number" : column.type === "email" ? "email" : column.type === "url" ? "url" : "text"} value={String(value)} onChange={(e) => onChange(e.target.value)} onKeyDown={enter} />;
}

function ColumnPicker({ search, onSearch, onSelect, column, hiddenColumns = [], onShow, onRename }: { search: string; onSearch: (value: string) => void; onSelect: (type: ColumnType) => void; column?: Column; hiddenColumns?: Column[]; onShow?: (id: string) => void; onRename?: (name: string) => void }) {
  const types = (Object.entries(TYPE_INFO) as [ColumnType, { label: string; icon: string }][]).filter(([, info]) => info.label.toLowerCase().includes(search.toLowerCase()));
  return <div className={`ms-column-picker${column ? " is-property" : ""}`} role="dialog" aria-label={column ? `Options for ${column.name}` : "Add column"} data-table-popup>
    <label><span><TableIcon name="search" /></span><input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search" autoFocus /></label>
    <div className="ms-picker-rule" />
    {column ? <><div className="ms-column-name-field"><label htmlFor={`column-name-${column.id}`}>Column name</label><input id={`column-name-${column.id}`} aria-label="Column name" value={column.name} onChange={(event) => onRename?.(event.target.value)} /></div><div className="ms-picker-rule" /><h3>Change property type</h3></> : <>{hiddenColumns.length > 0 && <><h3>Hidden columns</h3><div className="ms-hidden-columns">{hiddenColumns.map((hidden) => <button key={hidden.id} onClick={() => onShow?.(hidden.id)}><span><PropertyIcon type={hidden.type} /></span>{hidden.name}<em>Show</em></button>)}</div><div className="ms-picker-rule" /></>}<h3>Fill column with AI</h3><div className="ms-ai-types"><button>≡ Summary</button><button>☆ Translation</button><button>◇ Category</button><button>✦ Insights</button><button>♨ Custom autofill</button></div><h3>General</h3></>}
    <div className="ms-type-grid">{types.map(([type, info]) => <button className={column?.type === type ? "is-active" : ""} key={type} onClick={() => onSelect(type)}><span><PropertyIcon type={type} /></span>{info.label}{type === "page" && <em>New</em>}</button>)}</div>
  </div>;
}

function ColumnActions({ column, position, summarizeOpen, moreOpen, onEdit, onDuplicate, onInsert, onFilter, onToggleSummarize, onSummarize, onFreeze, onHide, onDelete, onToggleMore }: { column: Column; position: { left: number; top: number }; summarizeOpen: boolean; moreOpen: boolean; onEdit: () => void; onDuplicate: () => void; onInsert: (side: "left" | "right") => void; onFilter: () => void; onToggleSummarize: () => void; onSummarize: (kind: "count" | "filled" | "empty") => void; onFreeze: () => void; onHide: () => void; onDelete: () => void; onToggleMore: () => void }) {
  return <div className="ms-column-actions" style={{ left: position.left, top: position.top }} role="menu" aria-label={`Options for ${column.name}`} data-table-popup>
    <button onClick={onEdit}><span><TableIcon name="edit" /></span>Edit column</button><div />
    <button onClick={onDuplicate}><span><TableIcon name="duplicate" /></span>Duplicate column<span>›</span></button>
    <button onClick={() => onInsert("left")}><span>←</span>Insert left</button><button onClick={() => onInsert("right")}><span>→</span>Insert right</button><div />
    <button className="is-highlight" onClick={onFilter}><span><TableIcon name="filter" /></span>Filter column</button><div />
    <button onClick={onToggleSummarize}><span><TableIcon name="summarize" /></span>Summarize column<span>›</span></button>
    {summarizeOpen && <div className="ms-action-submenu"><button onClick={() => onSummarize("count")}>Count rows</button><button onClick={() => onSummarize("filled")}>Count values</button><button onClick={() => onSummarize("empty")}>Percent empty</button></div>}
    <div /><button onClick={onFreeze}><span><TableIcon name="freeze" /></span>Freeze up to this column</button><div />
    <button onClick={onHide}><span>◒</span>Hide column</button><button className="is-danger" onClick={onDelete}><span><TableIcon name="delete" /></span>Delete column</button><div />
    <button onClick={onToggleMore}><span>•••</span>View more actions<span>›</span></button>
    {moreOpen && <div className="ms-action-submenu is-bottom"><button onClick={() => void navigator.clipboard.writeText(`${location.href}#column-${column.id}`)}>Copy column link</button><button onClick={onEdit}>Change property type</button></div>}
  </div>;
}

function SelectOptionsPopup({ column, value, position, notice, onChoose, onCreate, onReorder, onColor, onDelete, onSaveMacro }: { column: Column; value: string | boolean | undefined; position: { left: number; top: number }; notice: string; onChoose: (label: string) => void; onCreate: (label: string) => void; onReorder: (optionId: string, targetId: string) => void; onColor: (optionId: string, color: string) => void; onDelete: (option: SelectOption) => void; onSaveMacro: (option: SelectOption) => void }) {
  const [query, setQuery] = useState(""); const [editing, setEditing] = useState<{ id: string; left: number; top: number } | null>(null);
  const multiple = column.type === "multiple"; const selected = selectedLabels(value, multiple);
  const options = (column.options ?? []).filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));
  const editingOption = editing ? column.options?.find((option) => option.id === editing.id) : undefined;
  function create() { const label = query.trim(); if (!label) return; onCreate(label); setQuery(""); }
  return <div className="ms-select-popup" style={{ left: position.left, top: position.top }} role="dialog" aria-label={`Select options for ${column.name}`} data-table-popup>
    <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); create(); } }} placeholder="Type an option and press Enter" autoFocus /></label>
    <div className="ms-select-options" onScroll={() => setEditing(null)}>{options.map((option) => <div className={`ms-select-option${selected.includes(option.label) ? " is-selected" : ""}`} key={option.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const source = event.dataTransfer.getData("text/select-option"); if (source) onReorder(source, option.id); }}>
      <button type="button" className="ms-option-drag" aria-label={`Reorder ${option.label}`} draggable onDragStart={(event) => event.dataTransfer.setData("text/select-option", option.id)}>⠿</button>
      <button type="button" className="ms-option-choice" onClick={() => onChoose(option.label)}><span style={{ "--select-color": option.color } as CSSProperties}>{option.label}</span>{selected.includes(option.label) && <em>✓</em>}</button>
      <button type="button" className="ms-option-more" aria-label={`Edit ${option.label}`} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const width = 280; const left = rect.right + 7 + width <= window.innerWidth - 8 ? rect.right + 7 : Math.max(8, rect.left - width - 7); setEditing(editing?.id === option.id ? null : { id: option.id, left, top: Math.max(8, Math.min(rect.top - 5, window.innerHeight - 178)) }); }}>•••</button>
    </div>)}</div>
    {editing && editingOption && createPortal(<div className="ms-option-editor" style={{ left: editing.left, top: editing.top }} role="menu" aria-label={`Edit options for ${editingOption.label}`} data-table-popup><p>Color</p><div>{SELECT_COLORS.map((color) => <button type="button" key={color} aria-label={`Use ${color}`} className={editingOption.color === color ? "is-active" : ""} style={{ backgroundColor: color }} onClick={() => { onColor(editingOption.id, color); setEditing(null); }} />)}</div><button type="button" onClick={() => onSaveMacro(editingOption)}><span>◇</span>Save as macro pretext</button><button type="button" className="is-danger" onClick={() => { onDelete(editingOption); setEditing(null); }}><span>♜</span>Delete option</button></div>, document.body)}
    {!options.length && <p className="ms-select-empty">{query.trim() ? "Press Enter to create this option." : "No options yet."}</p>}
    {notice && <p className="ms-select-notice">{notice}</p>}
  </div>;
}

export default function TablesPage() {
  const [tables, setTables] = useState<WorkTable[]>([]);
  const [activeId, setActiveId] = useState("");
  const [ready, setReady] = useState(false);
  const [picker, setPicker] = useState<"add" | string | null>(null);
  const [typeSearch, setTypeSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tableMenu, setTableMenu] = useState<string | null>(null);
  const [iconMenu, setIconMenu] = useState<string | null>(null);
  const [renamingTable, setRenamingTable] = useState<string | null>(null);
  const [columnMenu, setColumnMenu] = useState<{ id: string; left: number; top: number } | null>(null);
  const [summaryMenu, setSummaryMenu] = useState<string | null>(null);
  const [moreMenu, setMoreMenu] = useState<string | null>(null);
  const [filterColumn, setFilterColumn] = useState<string | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [frozenColumn, setFrozenColumn] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, "count" | "filled" | "empty">>({});
  const [openPage, setOpenPage] = useState<{ rowId: string; columnId: string } | null>(null);
  const [focusCell, setFocusCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [columnDropTarget, setColumnDropTarget] = useState<{ id: string; placement: "before" | "after" } | null>(null);
  const [selectPopup, setSelectPopup] = useState<{ rowId: string; columnId: string; left: number; top: number } | null>(null);
  const [selectNotice, setSelectNotice] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(userStorageKey(STORAGE_KEY)) ?? "[]") as WorkTable[];
      const initial = parsed.length ? parsed.map((table) => ({ ...table, icon: normalizeTableIcon(table.icon), columns: table.columns.map((column) => ({ ...column, options: Array.isArray(column.options) ? column.options : undefined })) })) : [makeTable(1)]; setTables(initial); setActiveId(initial[0]!.id);
    } catch { const initial = makeTable(1); setTables([initial]); setActiveId(initial.id); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(userStorageKey(STORAGE_KEY), JSON.stringify(tables)); }, [tables, ready]);
  useEffect(() => {
    if (!ready) return;
    function consumeAOCommand() {
      const raw = localStorage.getItem(userStorageKey(AO_TABLE_COMMAND_KEY));
      if (!raw) return;
      localStorage.removeItem(userStorageKey(AO_TABLE_COMMAND_KEY));
      try {
        const command = JSON.parse(raw) as AOTableCommand;
        if (!command || typeof command.action !== "string") return;
        setTables((current) => {
          const result = applyTableMacro(current, activeId, command);
          setActiveId(result.activeId);
          if (result.openPage) setOpenPage(result.openPage);
          if (result.focusCell) setFocusCell(result.focusCell);
          if (result.openColumn) { setPicker(result.openColumn); setTypeSearch(""); }
          if (result.filter) { setFilterColumn(result.filter.columnId); setQuery(result.filter.query); setFilterOpen(true); }
          if (result.summary) setSummaries((currentSummaries) => ({ ...currentSummaries, [result.summary!]: "count" }));
          return result.tables;
        });
      } catch { /* ignore invalid macro commands */ }
    }
    consumeAOCommand();
    window.addEventListener(AO_TABLE_COMMAND_EVENT, consumeAOCommand);
    return () => window.removeEventListener(AO_TABLE_COMMAND_EVENT, consumeAOCommand);
  }, [ready, activeId]);
  useEffect(() => {
    if (!focusCell) return;
    const cell = document.querySelector(`[data-ao-cell="${focusCell.rowId}:${focusCell.columnId}"]`);
    const target = cell?.querySelector<HTMLElement>("input, button");
    target?.focus();
    setFocusCell(null);
  }, [focusCell, tables]);
  useEffect(() => {
    function dismissPopups(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest("[data-table-popup]")) return;
      setPicker(null); setFilterOpen(false); setGroupOpen(false); setTableMenu(null); setIconMenu(null); setColumnMenu(null); setSummaryMenu(null); setMoreMenu(null); setOpenPage(null); setSelectPopup(null);
    }
    document.addEventListener("pointerdown", dismissPopups);
    return () => document.removeEventListener("pointerdown", dismissPopups);
  }, []);

  const table = tables.find((item) => item.id === activeId) ?? tables[0];
  const visibleRows = useMemo(() => table?.rows.filter((row) => !query || (filterColumn ? String(row.cells[filterColumn] ?? "").toLowerCase().includes(query.toLowerCase()) : Object.values(row.cells).some((value) => String(value).toLowerCase().includes(query.toLowerCase())))) ?? [], [table, query, filterColumn]);
  if (!table) return null;
  function changeTable(update: (current: WorkTable) => WorkTable) { setTables((all) => all.map((item) => item.id === table?.id ? update(item) : item)); }
  function addTable() { const next = makeTable(tables.length + 1); setTables((all) => [...all, next]); setActiveId(next.id); }
  function addRow() { changeTable(addRowModel); }
  function updateCell(rowId: string, columnId: string, value: string | boolean) { changeTable((current) => updateCellModel(current, rowId, columnId, value)); }
  function moveToNextRow(rowId: string, columnId: string) { const at = visibleRows.findIndex((row) => row.id === rowId); const next = visibleRows[at + 1]; if (next) setFocusCell({ rowId: next.id, columnId }); }
  function openSelect(rowId: string, columnId: string, target: HTMLButtonElement) { const rect = target.getBoundingClientRect(); const width = 310; setSelectNotice(""); setSelectPopup({ rowId, columnId, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 430)) }); }
  function updateSelectOptions(columnId: string, transform: (options: SelectOption[]) => SelectOption[]) { changeTable((current) => { const column = current.columns.find((item) => item.id === columnId); return setColumnOptions(current, columnId, transform(column?.options ?? [])); }); }
  function saveOptionMacro(option: SelectOption) { let entries: AOMacroPreset[] = []; try { const parsed = JSON.parse(localStorage.getItem(userStorageKey(AO_MACROS_KEY)) ?? "[]") as AOMacroPreset[]; if (Array.isArray(parsed)) entries = parsed; } catch { /* start a clean Vault list */ } localStorage.setItem(userStorageKey(AO_MACROS_KEY), JSON.stringify(saveMacroPretext(entries, option.label))); setSelectNotice(`${option.label} saved to Vault.`); }
  function addColumn(type: ColumnType) {
    changeTable((current) => addColumnModel(current, type)); setPicker(null); setTypeSearch("");
  }
  function setIcon(id: string, icon: string) { setTables((all) => all.map((item) => item.id === id ? { ...item, icon } : item)); setIconMenu(null); }
  function copyTable(item: WorkTable) { const copy = duplicateTable(item, `${item.name} copy`); setTables((all) => [...all, copy]); setActiveId(copy.id); setTableMenu(null); }
  function removeTable(id: string) { if (tables.length === 1) return; const remaining = tables.filter((item) => item.id !== id); setTables(remaining); if (activeId === id) setActiveId(remaining[0]!.id); setTableMenu(null); }
  function dropColumn(source: string, target: string, placement: "before" | "after") {
    if (source === target) return;
    if (placement === "before") { changeTable((current) => moveColumn(current, source, target)); return; }
    changeTable((current) => {
      const moved = current.columns.find((column) => column.id === source); if (!moved) return current;
      const columns = current.columns.filter((column) => column.id !== source); const targetIndex = columns.findIndex((column) => column.id === target);
      if (targetIndex < 0) return current; columns.splice(targetIndex + 1, 0, moved); return { ...current, columns };
    });
  }
  const selectedColumn = picker && picker !== "add" ? table.columns.find((column) => column.id === picker) : undefined;
  const actionColumn = columnMenu ? table.columns.find((column) => column.id === columnMenu.id) : undefined;
  const visibleColumns = table.columns.filter((column) => !column.hidden);
  const groupColumn = table.columns.find((column) => column.id === table.groupBy);
  const groupedRows = groupColumn ? Array.from(visibleRows.reduce((groups, row) => { const raw = row.cells[groupColumn.id]; const display = groupColumn.type === "multiple" ? selectedLabels(raw, true).join(", ") : typeof raw === "string" ? raw : ""; const label = display.trim() || "Empty"; const rows = groups.get(label) ?? []; rows.push(row); groups.set(label, rows); return groups; }, new Map<string, Row[]>())) : [["", visibleRows] as [string, Row[]]];
  const frozenIndex = visibleColumns.findIndex((column) => column.id === frozenColumn);
  const currentTable = table;
  const pageRow = openPage ? table.rows.find((row) => row.id === openPage.rowId) : undefined;
  const pageColumn = openPage ? table.columns.find((column) => column.id === openPage.columnId) : undefined;
  const selectRow = selectPopup ? table.rows.find((row) => row.id === selectPopup.rowId) : undefined;
  const selectColumn = selectPopup ? table.columns.find((column) => column.id === selectPopup.columnId) : undefined;
  const pageDocument = decodePageCell(pageRow && pageColumn ? pageRow.cells[pageColumn.id] : "");
  function summaryFor(column: Column) { const kind = summaries[column.id]; if (!kind) return ""; const values = currentTable.rows.map((row) => row.cells[column.id]).filter((value) => value !== "" && value !== undefined && value !== false); if (kind === "count") return `${currentTable.rows.length} rows`; if (kind === "filled") return `${values.length} values`; return `${Math.round(((currentTable.rows.length - values.length) / Math.max(1, currentTable.rows.length)) * 100)}% empty`; }

  return <main className={`ms-tables-page${sidebarCollapsed ? " is-sidebar-collapsed" : ""}`}>
    <aside className="ms-tables-sidebar">
      <div className="ms-tables-side-head"><h1>Tables</h1><button type="button" aria-label="Collapse Tables panel" onClick={() => setSidebarCollapsed(true)}>«</button></div>
      <div className="ms-table-list">
        {tables.map((item) => <div key={item.id} className={`ms-table-list-item${item.id === table.id ? " is-active" : ""}`} onClick={() => setActiveId(item.id)}>
          <button type="button" className="ms-table-icon" aria-label={`Change icon for ${item.name}`} onClick={(e) => { e.stopPropagation(); setIconMenu(iconMenu === item.id ? null : item.id); setTableMenu(null); }}>{normalizeTableIcon(item.icon)}</button>
          {renamingTable === item.id ? <input className="ms-table-rename" aria-label={`Rename ${item.name}`} value={item.name} autoFocus onClick={(e) => e.stopPropagation()} onChange={(e) => setTables((all) => all.map((entry) => entry.id === item.id ? { ...entry, name: e.target.value } : entry))} onBlur={() => setRenamingTable(null)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setRenamingTable(null); }} /> : <span>{item.name}</span>}
          <button type="button" className="ms-table-more" aria-label={`Options for ${item.name}`} onClick={(e) => { e.stopPropagation(); setTableMenu(tableMenu === item.id ? null : item.id); setIconMenu(null); }}>•••</button>
          {tableMenu === item.id && <div className="ms-table-small-menu" role="menu" data-table-popup onClick={(e) => e.stopPropagation()}><button className="is-highlight" onClick={() => { void navigator.clipboard.writeText(`${location.href}#table-${item.id}`); setTableMenu(null); }}><span>↗</span>Copy link</button><button onClick={() => { setRenamingTable(item.id); setTableMenu(null); }}><span>◇</span>Rename</button><button onClick={() => copyTable(item)}><span>▣</span>Duplicate</button><div /><button className="is-danger" disabled={tables.length === 1} onClick={() => removeTable(item.id)}><span>♜</span>Delete</button></div>}
          {iconMenu === item.id && <div className="ms-table-icon-menu" role="dialog" aria-label={`Choose icon for ${item.name}`} data-table-popup onClick={(e) => e.stopPropagation()}>{TABLE_ICON_GROUPS.map((group) => <section key={group.label}><h3>{group.label}</h3><div>{group.icons.map((icon) => <button key={icon.symbol} aria-label={`${icon.label} symbol`} title={icon.label} className={normalizeTableIcon(item.icon) === icon.symbol ? "is-active" : ""} onClick={() => setIcon(item.id, icon.symbol)}>{icon.symbol}</button>)}</div></section>)}</div>}
        </div>)}
      </div>
      <button type="button" className="ms-add-table" onClick={addTable}><span>＋</span> Add <span>⌄</span></button>
    </aside>
    <section className="ms-table-stage">
      {sidebarCollapsed && <button type="button" className="ms-tables-expand" aria-label="Expand Tables panel" onClick={() => setSidebarCollapsed(false)}>»</button>}
      <div className="ms-view-tabs"><label className="ms-table-picker"><span>Tables</span><select aria-label="Select table" value={table.id} onChange={(event) => setActiveId(event.target.value)}>{tables.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" className="ms-view-add" aria-label="Add table" onClick={addTable}>＋</button></div>
      <div className="ms-data-frame">
        <div className="ms-data-toolbar">
          <div className="ms-toolbar-main">
            <button className="is-accent" onClick={addRow}>＋ Add record</button><i />
            <button onClick={() => setFilterOpen(!filterOpen)}><TableIcon name="filter" />Filter</button><button>↕ Sort</button><button className={groupColumn ? "is-active" : ""} onClick={() => setGroupOpen(!groupOpen)}><TableIcon name="group" />Group{groupColumn ? ` · ${groupColumn.name}` : ""}</button><button onClick={() => { setColumnMenu(null); setPicker(picker === "add" ? null : "add"); }}>▦ Column</button>
          </div>
          <div className="ms-toolbar-end"><button title="Clipboard" aria-label="Clipboard"><TableIcon name="clipboard" /></button><i /><button title="Appearance" aria-label="Appearance"><TableIcon name="appearance" /></button><button title="Settings" aria-label="Settings"><TableIcon name="settings" /></button><button title="Search" aria-label="Search" onClick={() => setFilterOpen(!filterOpen)}><TableIcon name="search" /></button><button title="Comments" aria-label="Comments"><TableIcon name="comments" /></button></div>
        </div>
        {filterOpen && <div className="ms-table-search" data-table-popup><span><TableIcon name="search" /></span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records…" autoFocus /><button onClick={() => { setQuery(""); setFilterOpen(false); }}>×</button></div>}
        {groupOpen && <div className="ms-group-menu" role="menu" aria-label="Group table" data-table-popup><p>Group by</p><button className={!table.groupBy ? "is-active" : ""} onClick={() => { changeTable((current) => ({ ...current, groupBy: undefined })); setGroupOpen(false); }}>No grouping</button>{visibleColumns.map((column) => <button key={column.id} className={table.groupBy === column.id ? "is-active" : ""} onClick={() => { changeTable((current) => ({ ...current, groupBy: column.id })); setGroupOpen(false); }}><span><PropertyIcon type={column.type} /></span>{column.name}{table.groupBy === column.id && <em>✓</em>}</button>)}</div>}
        <div className="ms-data-scroll">
          <table className="ms-data-grid">
            <thead><tr><th className="ms-row-number"><span className="ms-grid-select" /></th>{visibleColumns.map((column, columnIndex) => { const placement = columnDropTarget?.id === column.id ? columnDropTarget.placement : null; return <th className={`${frozenIndex >= columnIndex ? "is-frozen" : ""}${placement ? ` is-column-drop-${placement}` : ""}`} style={frozenIndex >= columnIndex ? { left: 42 + columnIndex * 145 } : undefined} key={column.id} onDragOver={(event) => { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); setColumnDropTarget({ id: column.id, placement: event.clientX < rect.left + rect.width / 2 ? "before" : "after" }); }} onDrop={(event) => { event.preventDefault(); const source = event.dataTransfer.getData("text/table-column"); const target = columnDropTarget?.id === column.id ? columnDropTarget : { id: column.id, placement: "before" as const }; if (source) dropColumn(source, target.id, target.placement); setColumnDropTarget(null); }}><button type="button" className="ms-column-drag" aria-label={`Move ${column.name} column`} draggable onDragStart={(event: DragEvent<HTMLButtonElement>) => { event.dataTransfer.setData("text/table-column", column.id); setColumnDropTarget(null); }} onDragEnd={() => setColumnDropTarget(null)}>⠿</button><span className="ms-column-type"><PropertyIcon type={column.type} /></span><input aria-label={`${column.name} column name`} value={column.name} onChange={(e) => changeTable((current) => ({ ...current, columns: current.columns.map((col) => col.id === column.id ? { ...col, name: e.target.value } : col) }))} /><button className="ms-column-options" aria-label={`Options for ${column.name} column`} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const width = 303; const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)); const top = Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 520)); setPicker(null); setColumnMenu(columnMenu?.id === column.id ? null : { id: column.id, left, top }); setSummaryMenu(null); setMoreMenu(null); }}>⌄</button></th>; })}<th className="ms-add-column"><button aria-label="Add column" onClick={() => { setColumnMenu(null); setPicker(picker === "add" ? null : "add"); }}>＋</button></th></tr></thead>
            <tbody>{groupedRows.map(([groupLabel, rows]) => [groupColumn && <tr className="ms-group-row" key={`group-${groupLabel}`}><td colSpan={visibleColumns.length + 2}><span><PropertyIcon type={groupColumn.type} /></span><strong>{groupLabel}</strong><em>{rows.length}</em></td></tr>, ...rows.map((row) => <tr key={row.id}><td className="ms-row-number">{visibleRows.findIndex((item) => item.id === row.id) + 1}</td>{visibleColumns.map((column, columnIndex) => <td data-ao-cell={`${row.id}:${column.id}`} className={frozenIndex >= columnIndex ? "is-frozen" : ""} style={frozenIndex >= columnIndex ? { left: 42 + columnIndex * 145 } : undefined} key={column.id}><Cell row={row} column={column} onChange={(value) => updateCell(row.id, column.id, value)} onEnter={() => moveToNextRow(row.id, column.id)} onOpenSelect={(target) => openSelect(row.id, column.id, target)} onOpenPage={() => setOpenPage({ rowId: row.id, columnId: column.id })} /></td>)}<td /></tr>)])}</tbody>
            {Object.keys(summaries).length > 0 && <tfoot><tr><td className="ms-row-number">Σ</td>{visibleColumns.map((column) => <td key={column.id}>{summaryFor(column)}</td>)}<td /></tr></tfoot>}
          </table>
          <button className="ms-grid-add-row" onClick={addRow}>＋</button>
        </div>
        {picker === "add" && <ColumnPicker search={typeSearch} onSearch={setTypeSearch} onSelect={addColumn} hiddenColumns={table.columns.filter((column) => column.hidden)} onShow={(id) => { changeTable((current) => showColumn(current, id)); setPicker(null); }} />}
        {selectedColumn && <ColumnPicker column={selectedColumn} search={typeSearch} onSearch={setTypeSearch} onRename={(name) => changeTable((current) => ({ ...current, columns: current.columns.map((candidate) => candidate.id === selectedColumn.id ? { ...candidate, name } : candidate) }))} onSelect={(type) => { changeTable((current) => changeColumnType(current, selectedColumn.id, type)); setPicker(null); }} />}
        {actionColumn && columnMenu && createPortal(<ColumnActions column={actionColumn} position={columnMenu} summarizeOpen={summaryMenu === actionColumn.id} moreOpen={moreMenu === actionColumn.id} onEdit={() => { setPicker(actionColumn.id); setColumnMenu(null); setTypeSearch(""); }} onDuplicate={() => { changeTable((current) => duplicateColumn(current, actionColumn.id)); setColumnMenu(null); }} onInsert={(side) => { changeTable((current) => insertColumn(current, actionColumn.id, side)); setColumnMenu(null); }} onFilter={() => { setFilterColumn(actionColumn.id); setFilterOpen(true); setColumnMenu(null); }} onToggleSummarize={() => setSummaryMenu(summaryMenu === actionColumn.id ? null : actionColumn.id)} onSummarize={(kind) => { setSummaries((all) => ({ ...all, [actionColumn.id]: kind })); setColumnMenu(null); }} onFreeze={() => { setFrozenColumn(frozenColumn === actionColumn.id ? null : actionColumn.id); setColumnMenu(null); }} onHide={() => { changeTable((current) => hideColumn(current, actionColumn.id)); setColumnMenu(null); }} onDelete={() => { changeTable((current) => deleteColumn(current, actionColumn.id)); setColumnMenu(null); }} onToggleMore={() => setMoreMenu(moreMenu === actionColumn.id ? null : actionColumn.id)} />, document.body)}
        {selectPopup && selectRow && selectColumn && createPortal(<SelectOptionsPopup column={selectColumn} value={selectRow.cells[selectColumn.id]} position={selectPopup} notice={selectNotice} onChoose={(label) => { const multiple = selectColumn.type === "multiple"; const selected = selectedLabels(selectRow.cells[selectColumn.id], multiple); const next = multiple ? selected.includes(label) ? selected.filter((item) => item !== label) : [...selected, label] : [label]; updateCell(selectRow.id, selectColumn.id, encodeSelected(next, multiple)); if (!multiple) setSelectPopup(null); }} onCreate={(label) => { const existing = selectColumn.options?.find((option) => option.label.toLowerCase() === label.toLowerCase()); if (!existing) { const option = { id: crypto.randomUUID(), label, color: SELECT_COLORS[(selectColumn.options?.length ?? 0) % SELECT_COLORS.length]! }; updateSelectOptions(selectColumn.id, (options) => [...options, option]); const selected = selectedLabels(selectRow.cells[selectColumn.id], selectColumn.type === "multiple"); updateCell(selectRow.id, selectColumn.id, encodeSelected(selectColumn.type === "multiple" ? [...selected, label] : [label], selectColumn.type === "multiple")); } else updateCell(selectRow.id, selectColumn.id, encodeSelected(selectColumn.type === "multiple" ? [...new Set([...selectedLabels(selectRow.cells[selectColumn.id], true), existing.label])] : [existing.label], selectColumn.type === "multiple")); }} onReorder={(optionId, targetId) => updateSelectOptions(selectColumn.id, (options) => { const from = options.findIndex((item) => item.id === optionId); const to = options.findIndex((item) => item.id === targetId); if (from < 0 || to < 0 || from === to) return options; const next = [...options]; const [option] = next.splice(from, 1); next.splice(to, 0, option!); return next; })} onColor={(optionId, color) => updateSelectOptions(selectColumn.id, (options) => options.map((option) => option.id === optionId ? { ...option, color } : option))} onDelete={(option) => changeTable((current) => ({ ...setColumnOptions(current, selectColumn.id, (selectColumn.options ?? []).filter((item) => item.id !== option.id)), rows: current.rows.map((row) => { const selected = selectedLabels(row.cells[selectColumn.id], selectColumn.type === "multiple").filter((label) => label !== option.label); return { ...row, cells: { ...row.cells, [selectColumn.id]: encodeSelected(selected, selectColumn.type === "multiple") } }; }) }))} onSaveMacro={saveOptionMacro} />, document.body)}
        {openPage && pageRow && pageColumn && createPortal(<div className="ms-page-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenPage(null); }}><section className="ms-page-modal" role="dialog" aria-modal="true" aria-label={`${pageColumn.name} page`} data-table-popup><header><div><span><PropertyIcon type={pageColumn.type} /></span><div><p>{table.name} · {pageColumn.name}</p><input aria-label="Page title" value={pageDocument.title} onChange={(event) => updateCell(pageRow.id, pageColumn.id, encodePageCell(event.target.value, pageDocument.body))} placeholder="Untitled page" /></div></div><button type="button" aria-label="Close page" onClick={() => setOpenPage(null)}>×</button></header><div className="ms-page-modal-editor"><LineEditor value={pageDocument.body} onChange={(body) => updateCell(pageRow.id, pageColumn.id, encodePageCell(pageDocument.title, body))} storageKey={`table-page:${table.id}:${pageRow.id}:${pageColumn.id}`} continuousSelection /></div></section></div>, document.body)}
      </div>
    </section>
  </main>;
}
