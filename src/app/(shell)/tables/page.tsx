"use client";

import { useEffect, useMemo, useState } from "react";

type ColumnType = "text" | "number" | "percent" | "currency" | "single" | "multiple" | "date" | "people" | "files" | "checkbox" | "reaction" | "formula" | "relation" | "rollup" | "page" | "url" | "phone" | "email";
type Column = { id: string; name: string; type: ColumnType };
type Row = { id: string; cells: Record<string, string | boolean> };
type Table = { id: string; name: string; columns: Column[]; rows: Row[] };

const TYPE_INFO: Record<ColumnType, { label: string; icon: string }> = {
  text: { label: "Text", icon: "A̲" }, number: { label: "Number", icon: "#" }, percent: { label: "Percent", icon: "%" }, currency: { label: "Currency", icon: "$" },
  single: { label: "Single select", icon: "⊙" }, multiple: { label: "Multiple select", icon: "☷" }, date: { label: "Date", icon: "□" }, people: { label: "People", icon: "▣" },
  files: { label: "Image & Files", icon: "⌕" }, checkbox: { label: "Checkbox", icon: "☑" }, reaction: { label: "Reaction", icon: "♧" }, formula: { label: "Formula", icon: "Σ" },
  relation: { label: "Relation", icon: "↗" }, rollup: { label: "Rollup", icon: "◉" }, page: { label: "Page", icon: "▤" }, url: { label: "URL", icon: "↗" },
  phone: { label: "Phone", icon: "⌕" }, email: { label: "Email", icon: "✉" },
};

const DEFAULT_COLUMNS: Column[] = [
  { id: "name", name: "Name", type: "text" }, { id: "people", name: "People", type: "people" },
  { id: "select", name: "Select", type: "single" }, { id: "date", name: "Date", type: "date" }, { id: "files", name: "Image & Files", type: "files" },
];
const emptyRows = () => Array.from({ length: 3 }, () => ({ id: crypto.randomUUID(), cells: {} }));
const makeTable = (number: number): Table => ({ id: crypto.randomUUID(), name: number === 1 ? "Table" : `Table ${number}`, columns: DEFAULT_COLUMNS.map((c) => ({ ...c, id: crypto.randomUUID() })), rows: emptyRows() });
const STORAGE_KEY = "work-sync:tables";

function Cell({ row, column, onChange }: { row: Row; column: Column; onChange: (value: string | boolean) => void }) {
  const value = row.cells[column.id] ?? "";
  if (column.type === "checkbox") return <label className="ms-grid-check"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /><span /></label>;
  if (column.type === "date") return <input type="date" value={String(value)} onChange={(e) => onChange(e.target.value)} />;
  if (column.type === "single" || column.type === "multiple") return <input value={String(value)} onChange={(e) => onChange(e.target.value)} placeholder="Select…" />;
  if (column.type === "people") return <input value={String(value)} onChange={(e) => onChange(e.target.value)} placeholder="Empty" />;
  if (column.type === "files") return <button className="ms-cell-upload" type="button">+ Add file</button>;
  return <input type={column.type === "number" || column.type === "currency" || column.type === "percent" ? "number" : column.type === "email" ? "email" : column.type === "url" ? "url" : "text"} value={String(value)} onChange={(e) => onChange(e.target.value)} />;
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [activeId, setActiveId] = useState("");
  const [ready, setReady] = useState(false);
  const [picker, setPicker] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Table[];
      const initial = parsed.length ? parsed : [makeTable(1)]; setTables(initial); setActiveId(initial[0]!.id);
    } catch { const initial = makeTable(1); setTables([initial]); setActiveId(initial.id); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(tables)); }, [tables, ready]);

  const table = tables.find((item) => item.id === activeId) ?? tables[0];
  const visibleRows = useMemo(() => table?.rows.filter((row) => !query || Object.values(row.cells).some((value) => String(value).toLowerCase().includes(query.toLowerCase()))) ?? [], [table, query]);
  function changeTable(update: (current: Table) => Table) { setTables((all) => all.map((item) => item.id === table?.id ? update(item) : item)); }
  function addTable() { const next = makeTable(tables.length + 1); setTables((all) => [...all, next]); setActiveId(next.id); }
  function addRow() { changeTable((current) => ({ ...current, rows: [...current.rows, { id: crypto.randomUUID(), cells: {} }] })); }
  function updateCell(rowId: string, columnId: string, value: string | boolean) { changeTable((current) => ({ ...current, rows: current.rows.map((row) => row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row) })); }
  function addColumn(type: ColumnType) {
    const column: Column = { id: crypto.randomUUID(), name: TYPE_INFO[type].label, type };
    changeTable((current) => ({ ...current, columns: [...current.columns, column] })); setPicker(false); setTypeSearch("");
  }
  const filteredTypes = (Object.entries(TYPE_INFO) as [ColumnType, { label: string; icon: string }][]).filter(([, info]) => info.label.toLowerCase().includes(typeSearch.toLowerCase()));

  if (!table) return null;
  return <main className="ms-tables-page">
    <aside className="ms-tables-sidebar">
      <div className="ms-tables-side-head"><h1>Tables</h1><span>«</span></div>
      <div className="ms-table-list">
        {tables.map((item) => <button type="button" key={item.id} className={item.id === table.id ? "is-active" : ""} onClick={() => setActiveId(item.id)}><span className="ms-table-icon">▦</span><span>{item.name}</span><span className="ms-table-more">•••</span></button>)}
      </div>
      <button type="button" className="ms-add-table" onClick={addTable}><span>＋</span> Add <span>⌄</span></button>
    </aside>
    <section className="ms-table-stage">
      <div className="ms-view-tabs"><button className="is-active"><span>▦</span> Grid <span>⋮</span></button><button className="ms-view-add" onClick={addTable}>＋</button></div>
      <div className="ms-data-frame">
        <div className="ms-data-toolbar">
          <div className="ms-toolbar-main">
            <button className="is-accent" onClick={addRow}>＋ Add record</button><i />
            <button onClick={() => setFilterOpen(!filterOpen)}>▽ Filter</button><button>↕ Sort</button><button>▤ Group</button><button onClick={() => setPicker(!picker)}>▦ Column</button>
          </div>
          <div className="ms-toolbar-end"><button title="Clipboard">▤</button><i /><button title="Appearance">◉</button><button title="Settings">⚙</button><button title="Search" onClick={() => setFilterOpen(!filterOpen)}>⌕</button><button title="Comments">▱</button></div>
        </div>
        {filterOpen && <div className="ms-table-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records…" autoFocus /><button onClick={() => { setQuery(""); setFilterOpen(false); }}>×</button></div>}
        <div className="ms-data-scroll">
          <table className="ms-data-grid">
            <thead><tr><th className="ms-row-number"><span className="ms-grid-select" /></th>{table.columns.map((column) => <th key={column.id}><span className="ms-column-type">{TYPE_INFO[column.type].icon}</span><input value={column.name} onChange={(e) => changeTable((current) => ({ ...current, columns: current.columns.map((col) => col.id === column.id ? { ...col, name: e.target.value } : col) }))} /><button>⌄</button></th>)}<th className="ms-add-column"><button onClick={() => setPicker(!picker)}>＋</button></th></tr></thead>
            <tbody>{visibleRows.map((row, index) => <tr key={row.id}><td className="ms-row-number">{index + 1}</td>{table.columns.map((column) => <td key={column.id}><Cell row={row} column={column} onChange={(value) => updateCell(row.id, column.id, value)} /></td>)}<td /></tr>)}</tbody>
          </table>
          <button className="ms-grid-add-row" onClick={addRow}>＋</button>
        </div>
        {picker && <div className="ms-column-picker">
          <label><span>⌕</span><input value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} placeholder="Search" autoFocus /></label>
          <div className="ms-picker-rule" /><h3>Fill column with AI</h3>
          <div className="ms-ai-types"><button>≡ Summary</button><button>☆ Translation</button><button>◇ Category</button><button>✦ Insights</button><button>♨ Custom autofill</button></div>
          <h3>General</h3><div className="ms-type-grid">{filteredTypes.map(([type, info]) => <button key={type} onClick={() => addColumn(type)}><span>{info.icon}</span>{info.label}{type === "page" && <em>New</em>}</button>)}</div>
        </div>}
      </div>
    </section>
  </main>;
}
