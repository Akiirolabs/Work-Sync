export type ColumnType = "text" | "number" | "percent" | "currency" | "single" | "multiple" | "date" | "people" | "files" | "checkbox" | "reaction" | "formula" | "relation" | "rollup" | "page" | "url" | "phone" | "email";
export type Column = { id: string; name: string; type: ColumnType; hidden?: boolean };
export type Row = { id: string; cells: Record<string, string | boolean> };
export type WorkTable = { id: string; name: string; icon: string; columns: Column[]; rows: Row[] };

export const TABLE_ICONS = ["▦", "▤", "▥", "◇", "○", "□", "△", "☆", "⌘", "◎", "◈", "☷"];
export const TYPE_INFO: Record<ColumnType, { label: string; icon: string }> = {
  text: { label: "Text", icon: "A̲" }, number: { label: "Number", icon: "#" }, percent: { label: "Percent", icon: "%" }, currency: { label: "Currency", icon: "$" },
  single: { label: "Single select", icon: "⊙" }, multiple: { label: "Multiple select", icon: "☷" }, date: { label: "Date", icon: "□" }, people: { label: "People", icon: "▣" },
  files: { label: "Image & Files", icon: "⌕" }, checkbox: { label: "Checkbox", icon: "☑" }, reaction: { label: "Reaction", icon: "♧" }, formula: { label: "Formula", icon: "Σ" },
  relation: { label: "Relation", icon: "↗" }, rollup: { label: "Rollup", icon: "◉" }, page: { label: "Page", icon: "▤" }, url: { label: "URL", icon: "↗" },
  phone: { label: "Phone", icon: "⌕" }, email: { label: "Email", icon: "✉" },
};

const DEFAULT_COLUMNS: Omit<Column, "id">[] = [
  { name: "Name", type: "text" }, { name: "People", type: "people" }, { name: "Select", type: "single" }, { name: "Date", type: "date" }, { name: "Image & Files", type: "files" },
];
const id = () => crypto.randomUUID();

export function makeTable(number: number): WorkTable { return { id: id(), name: number === 1 ? "Table" : `Table ${number}`, icon: TABLE_ICONS[0]!, columns: DEFAULT_COLUMNS.map((column) => ({ ...column, id: id() })), rows: Array.from({ length: 3 }, () => ({ id: id(), cells: {} })) }; }
export function addRow(table: WorkTable): WorkTable { return { ...table, rows: [...table.rows, { id: id(), cells: {} }] }; }
export function updateCell(table: WorkTable, rowId: string, columnId: string, value: string | boolean): WorkTable { return { ...table, rows: table.rows.map((row) => row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row) }; }
export function addColumn(table: WorkTable, type: ColumnType): WorkTable { return { ...table, columns: [...table.columns, { id: id(), name: TYPE_INFO[type].label, type }] }; }
export function changeColumnType(table: WorkTable, columnId: string, type: ColumnType): WorkTable { return { ...table, columns: table.columns.map((column) => column.id === columnId ? { ...column, type } : column) }; }
export function duplicateColumn(table: WorkTable, columnId: string): WorkTable { const source = table.columns.find((column) => column.id === columnId); if (!source) return table; const copy = { ...source, id: id(), name: `${source.name} copy` }; return { ...table, columns: [...table.columns, copy], rows: table.rows.map((row) => ({ ...row, cells: { ...row.cells, [copy.id]: row.cells[source.id] ?? "" } })) }; }
export function insertColumn(table: WorkTable, columnId: string, side: "left" | "right"): WorkTable { const index = table.columns.findIndex((column) => column.id === columnId); if (index < 0) return table; const column: Column = { id: id(), name: "Text", type: "text" }; const columns = [...table.columns]; columns.splice(index + (side === "right" ? 1 : 0), 0, column); return { ...table, columns }; }
export function hideColumn(table: WorkTable, columnId: string): WorkTable { if (table.columns.filter((column) => !column.hidden).length === 1) return table; return { ...table, columns: table.columns.map((column) => column.id === columnId ? { ...column, hidden: true } : column) }; }
export function showColumn(table: WorkTable, columnId: string): WorkTable { return { ...table, columns: table.columns.map((column) => column.id === columnId ? { ...column, hidden: false } : column) }; }
export function deleteColumn(table: WorkTable, columnId: string): WorkTable { if (table.columns.length === 1) return table; return { ...table, columns: table.columns.filter((column) => column.id !== columnId), rows: table.rows.map((row) => { const cells = { ...row.cells }; delete cells[columnId]; return { ...row, cells }; }) }; }
export function duplicateTable(table: WorkTable, name: string): WorkTable { const columns = table.columns.map((column) => ({ ...column, id: id() })); const columnIds = new Map(table.columns.map((column, index) => [column.id, columns[index]!.id])); return { ...table, id: id(), name, columns, rows: table.rows.map((row) => ({ id: id(), cells: Object.fromEntries(Object.entries(row.cells).map(([key, value]) => [columnIds.get(key) ?? key, value])) })) }; }
