"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { TABLE_ICON_GROUPS, TYPE_INFO, addColumn as addColumnModel, addRow as addRowModel, changeColumnType, decodePageCell, deleteColumn, duplicateColumn, duplicateTable, encodePageCell, hideColumn, insertColumn, makeTable, normalizeTableIcon, showColumn, updateCell as updateCellModel, type Column, type ColumnType, type Row, type WorkTable } from "@/lib/table-model";
import { LineEditor } from "@/components/LineEditor";
import { AO_TABLE_COMMAND_EVENT, AO_TABLE_COMMAND_KEY, applyTableMacro, type AOTableCommand } from "@/lib/ao-macro";
const STORAGE_KEY = "work-sync:tables";

function Cell({ row, column, onChange, onOpenPage }: { row: Row; column: Column; onChange: (value: string | boolean) => void; onOpenPage: () => void }) {
  const value = row.cells[column.id] ?? "";
  if (column.type === "checkbox") return <label className="ms-grid-check"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /><span /></label>;
  if (column.type === "date") return <input type="date" value={String(value)} onChange={(e) => onChange(e.target.value)} />;
  if (column.type === "single" || column.type === "multiple") return <input value={String(value)} onChange={(e) => onChange(e.target.value)} placeholder="Select…" />;
  if (column.type === "people") return <input value={String(value)} onChange={(e) => onChange(e.target.value)} placeholder="Empty" />;
  if (column.type === "files") return <button className="ms-cell-upload" type="button">+ Add file</button>;
  if (column.type === "page") { const page = decodePageCell(value); return <button className="ms-page-cell" type="button" onClick={onOpenPage}><span>▤</span>{page.title || "Open page"}</button>; }
  return <input type={column.type === "number" || column.type === "currency" || column.type === "percent" ? "number" : column.type === "email" ? "email" : column.type === "url" ? "url" : "text"} value={String(value)} onChange={(e) => onChange(e.target.value)} />;
}

function ColumnPicker({ search, onSearch, onSelect, column, hiddenColumns = [], onShow, onRename }: { search: string; onSearch: (value: string) => void; onSelect: (type: ColumnType) => void; column?: Column; hiddenColumns?: Column[]; onShow?: (id: string) => void; onRename?: (name: string) => void }) {
  const types = (Object.entries(TYPE_INFO) as [ColumnType, { label: string; icon: string }][]).filter(([, info]) => info.label.toLowerCase().includes(search.toLowerCase()));
  return <div className={`ms-column-picker${column ? " is-property" : ""}`} role="dialog" aria-label={column ? `Options for ${column.name}` : "Add column"} data-table-popup>
    <label><span>⌕</span><input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search" autoFocus /></label>
    <div className="ms-picker-rule" />
    {column ? <><div className="ms-column-name-field"><label htmlFor={`column-name-${column.id}`}>Column name</label><input id={`column-name-${column.id}`} aria-label="Column name" value={column.name} onChange={(event) => onRename?.(event.target.value)} /></div><div className="ms-picker-rule" /><h3>Change property type</h3></> : <>{hiddenColumns.length > 0 && <><h3>Hidden columns</h3><div className="ms-hidden-columns">{hiddenColumns.map((hidden) => <button key={hidden.id} onClick={() => onShow?.(hidden.id)}><span>{TYPE_INFO[hidden.type].icon}</span>{hidden.name}<em>Show</em></button>)}</div><div className="ms-picker-rule" /></>}<h3>Fill column with AI</h3><div className="ms-ai-types"><button>≡ Summary</button><button>☆ Translation</button><button>◇ Category</button><button>✦ Insights</button><button>♨ Custom autofill</button></div><h3>General</h3></>}
    <div className="ms-type-grid">{types.map(([type, info]) => <button className={column?.type === type ? "is-active" : ""} key={type} onClick={() => onSelect(type)}><span>{info.icon}</span>{info.label}{type === "page" && <em>New</em>}</button>)}</div>
  </div>;
}

function ColumnActions({ column, position, summarizeOpen, moreOpen, onEdit, onDuplicate, onInsert, onFilter, onToggleSummarize, onSummarize, onFreeze, onHide, onDelete, onToggleMore }: { column: Column; position: { left: number; top: number }; summarizeOpen: boolean; moreOpen: boolean; onEdit: () => void; onDuplicate: () => void; onInsert: (side: "left" | "right") => void; onFilter: () => void; onToggleSummarize: () => void; onSummarize: (kind: "count" | "filled" | "empty") => void; onFreeze: () => void; onHide: () => void; onDelete: () => void; onToggleMore: () => void }) {
  return <div className="ms-column-actions" style={{ left: position.left, top: position.top }} role="menu" aria-label={`Options for ${column.name}`} data-table-popup>
    <button onClick={onEdit}><span>◇</span>Edit column</button><div />
    <button onClick={onDuplicate}><span>▣</span>Duplicate column<span>›</span></button>
    <button onClick={() => onInsert("left")}><span>←</span>Insert left</button><button onClick={() => onInsert("right")}><span>→</span>Insert right</button><div />
    <button className="is-highlight" onClick={onFilter}><span>▽</span>Filter column</button><div />
    <button onClick={onToggleSummarize}><span>▧</span>Summarize column<span>›</span></button>
    {summarizeOpen && <div className="ms-action-submenu"><button onClick={() => onSummarize("count")}>Count rows</button><button onClick={() => onSummarize("filled")}>Count values</button><button onClick={() => onSummarize("empty")}>Percent empty</button></div>}
    <div /><button onClick={onFreeze}><span>▨</span>Freeze up to this column</button><div />
    <button onClick={onHide}><span>◒</span>Hide column</button><button className="is-danger" onClick={onDelete}><span>♜</span>Delete column</button><div />
    <button onClick={onToggleMore}><span>•••</span>View more actions<span>›</span></button>
    {moreOpen && <div className="ms-action-submenu is-bottom"><button onClick={() => void navigator.clipboard.writeText(`${location.href}#column-${column.id}`)}>Copy column link</button><button onClick={onEdit}>Change property type</button></div>}
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
  const [frozenColumn, setFrozenColumn] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, "count" | "filled" | "empty">>({});
  const [openPage, setOpenPage] = useState<{ rowId: string; columnId: string } | null>(null);
  const [focusCell, setFocusCell] = useState<{ rowId: string; columnId: string } | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as WorkTable[];
      const initial = parsed.length ? parsed.map((table) => ({ ...table, icon: normalizeTableIcon(table.icon) })) : [makeTable(1)]; setTables(initial); setActiveId(initial[0]!.id);
    } catch { const initial = makeTable(1); setTables([initial]); setActiveId(initial.id); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(tables)); }, [tables, ready]);
  useEffect(() => {
    if (!ready) return;
    function consumeAOCommand() {
      const raw = localStorage.getItem(AO_TABLE_COMMAND_KEY);
      if (!raw) return;
      localStorage.removeItem(AO_TABLE_COMMAND_KEY);
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
      setPicker(null); setFilterOpen(false); setTableMenu(null); setIconMenu(null); setColumnMenu(null); setSummaryMenu(null); setMoreMenu(null); setOpenPage(null);
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
  function addColumn(type: ColumnType) {
    changeTable((current) => addColumnModel(current, type)); setPicker(null); setTypeSearch("");
  }
  function setIcon(id: string, icon: string) { setTables((all) => all.map((item) => item.id === id ? { ...item, icon } : item)); setIconMenu(null); }
  function copyTable(item: WorkTable) { const copy = duplicateTable(item, `${item.name} copy`); setTables((all) => [...all, copy]); setActiveId(copy.id); setTableMenu(null); }
  function removeTable(id: string) { if (tables.length === 1) return; const remaining = tables.filter((item) => item.id !== id); setTables(remaining); if (activeId === id) setActiveId(remaining[0]!.id); setTableMenu(null); }
  const selectedColumn = picker && picker !== "add" ? table.columns.find((column) => column.id === picker) : undefined;
  const actionColumn = columnMenu ? table.columns.find((column) => column.id === columnMenu.id) : undefined;
  const visibleColumns = table.columns.filter((column) => !column.hidden);
  const frozenIndex = visibleColumns.findIndex((column) => column.id === frozenColumn);
  const currentTable = table;
  const pageRow = openPage ? table.rows.find((row) => row.id === openPage.rowId) : undefined;
  const pageColumn = openPage ? table.columns.find((column) => column.id === openPage.columnId) : undefined;
  const pageDocument = decodePageCell(pageRow && pageColumn ? pageRow.cells[pageColumn.id] : "");
  function summaryFor(column: Column) { const kind = summaries[column.id]; if (!kind) return ""; const values = currentTable.rows.map((row) => row.cells[column.id]).filter((value) => value !== "" && value !== undefined && value !== false); if (kind === "count") return `${currentTable.rows.length} rows`; if (kind === "filled") return `${values.length} values`; return `${Math.round(((currentTable.rows.length - values.length) / Math.max(1, currentTable.rows.length)) * 100)}% empty`; }

  return <main className="ms-tables-page">
    <aside className="ms-tables-sidebar">
      <div className="ms-tables-side-head"><h1>Tables</h1><span>«</span></div>
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
      <div className="ms-view-tabs"><button className="is-active"><span>▦</span> Grid <span>⋮</span></button><button className="ms-view-add" onClick={addTable}>＋</button></div>
      <div className="ms-data-frame">
        <div className="ms-data-toolbar">
          <div className="ms-toolbar-main">
            <button className="is-accent" onClick={addRow}>＋ Add record</button><i />
            <button onClick={() => setFilterOpen(!filterOpen)}>▽ Filter</button><button>↕ Sort</button><button>▤ Group</button><button onClick={() => { setColumnMenu(null); setPicker(picker === "add" ? null : "add"); }}>▦ Column</button>
          </div>
          <div className="ms-toolbar-end"><button title="Clipboard">▤</button><i /><button title="Appearance">◉</button><button title="Settings">⚙</button><button title="Search" onClick={() => setFilterOpen(!filterOpen)}>⌕</button><button title="Comments">▱</button></div>
        </div>
        {filterOpen && <div className="ms-table-search" data-table-popup><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records…" autoFocus /><button onClick={() => { setQuery(""); setFilterOpen(false); }}>×</button></div>}
        <div className="ms-data-scroll">
          <table className="ms-data-grid">
            <thead><tr><th className="ms-row-number"><span className="ms-grid-select" /></th>{visibleColumns.map((column, columnIndex) => <th className={frozenIndex >= columnIndex ? "is-frozen" : ""} style={frozenIndex >= columnIndex ? { left: 42 + columnIndex * 145 } : undefined} key={column.id}><span className="ms-column-type">{TYPE_INFO[column.type].icon}</span><input aria-label={`${column.name} column name`} value={column.name} onChange={(e) => changeTable((current) => ({ ...current, columns: current.columns.map((col) => col.id === column.id ? { ...col, name: e.target.value } : col) }))} /><button aria-label={`Options for ${column.name} column`} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const width = 303; const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)); const top = Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 520)); setPicker(null); setColumnMenu(columnMenu?.id === column.id ? null : { id: column.id, left, top }); setSummaryMenu(null); setMoreMenu(null); }}>⌄</button></th>)}<th className="ms-add-column"><button aria-label="Add column" onClick={() => { setColumnMenu(null); setPicker(picker === "add" ? null : "add"); }}>＋</button></th></tr></thead>
            <tbody>{visibleRows.map((row, index) => <tr key={row.id}><td className="ms-row-number">{index + 1}</td>{visibleColumns.map((column, columnIndex) => <td data-ao-cell={`${row.id}:${column.id}`} className={frozenIndex >= columnIndex ? "is-frozen" : ""} style={frozenIndex >= columnIndex ? { left: 42 + columnIndex * 145 } : undefined} key={column.id}><Cell row={row} column={column} onChange={(value) => updateCell(row.id, column.id, value)} onOpenPage={() => setOpenPage({ rowId: row.id, columnId: column.id })} /></td>)}<td /></tr>)}</tbody>
            {Object.keys(summaries).length > 0 && <tfoot><tr><td className="ms-row-number">Σ</td>{visibleColumns.map((column) => <td key={column.id}>{summaryFor(column)}</td>)}<td /></tr></tfoot>}
          </table>
          <button className="ms-grid-add-row" onClick={addRow}>＋</button>
        </div>
        {picker === "add" && <ColumnPicker search={typeSearch} onSearch={setTypeSearch} onSelect={addColumn} hiddenColumns={table.columns.filter((column) => column.hidden)} onShow={(id) => { changeTable((current) => showColumn(current, id)); setPicker(null); }} />}
        {selectedColumn && <ColumnPicker column={selectedColumn} search={typeSearch} onSearch={setTypeSearch} onRename={(name) => changeTable((current) => ({ ...current, columns: current.columns.map((candidate) => candidate.id === selectedColumn.id ? { ...candidate, name } : candidate) }))} onSelect={(type) => { changeTable((current) => changeColumnType(current, selectedColumn.id, type)); setPicker(null); }} />}
        {actionColumn && columnMenu && createPortal(<ColumnActions column={actionColumn} position={columnMenu} summarizeOpen={summaryMenu === actionColumn.id} moreOpen={moreMenu === actionColumn.id} onEdit={() => { setPicker(actionColumn.id); setColumnMenu(null); setTypeSearch(""); }} onDuplicate={() => { changeTable((current) => duplicateColumn(current, actionColumn.id)); setColumnMenu(null); }} onInsert={(side) => { changeTable((current) => insertColumn(current, actionColumn.id, side)); setColumnMenu(null); }} onFilter={() => { setFilterColumn(actionColumn.id); setFilterOpen(true); setColumnMenu(null); }} onToggleSummarize={() => setSummaryMenu(summaryMenu === actionColumn.id ? null : actionColumn.id)} onSummarize={(kind) => { setSummaries((all) => ({ ...all, [actionColumn.id]: kind })); setColumnMenu(null); }} onFreeze={() => { setFrozenColumn(frozenColumn === actionColumn.id ? null : actionColumn.id); setColumnMenu(null); }} onHide={() => { changeTable((current) => hideColumn(current, actionColumn.id)); setColumnMenu(null); }} onDelete={() => { changeTable((current) => deleteColumn(current, actionColumn.id)); setColumnMenu(null); }} onToggleMore={() => setMoreMenu(moreMenu === actionColumn.id ? null : actionColumn.id)} />, document.body)}
        {openPage && pageRow && pageColumn && createPortal(<div className="ms-page-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenPage(null); }}><section className="ms-page-modal" role="dialog" aria-modal="true" aria-label={`${pageColumn.name} page`} data-table-popup><header><div><span>{TYPE_INFO[pageColumn.type].icon}</span><div><p>{table.name} · {pageColumn.name}</p><input aria-label="Page title" value={pageDocument.title} onChange={(event) => updateCell(pageRow.id, pageColumn.id, encodePageCell(event.target.value, pageDocument.body))} placeholder="Untitled page" /></div></div><button type="button" aria-label="Close page" onClick={() => setOpenPage(null)}>×</button></header><div className="ms-page-modal-editor"><LineEditor value={pageDocument.body} onChange={(body) => updateCell(pageRow.id, pageColumn.id, encodePageCell(pageDocument.title, body))} storageKey={`table-page:${table.id}:${pageRow.id}:${pageColumn.id}`} /></div></section></div>, document.body)}
      </div>
    </section>
  </main>;
}
