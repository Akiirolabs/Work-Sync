export type ColumnType = "text" | "number" | "percent" | "currency" | "single" | "multiple" | "date" | "people" | "files" | "checkbox" | "reaction" | "formula" | "relation" | "rollup" | "page" | "url" | "phone" | "email";
export type Column = { id: string; name: string; type: ColumnType; hidden?: boolean };
export type Row = { id: string; cells: Record<string, string | boolean> };
export type WorkTable = { id: string; name: string; icon: string; columns: Column[]; rows: Row[] };

export const TABLE_ICON_GROUPS = [
  { label: "Office", icons: [
    { symbol: "▤", label: "Document" }, { symbol: "▦", label: "Spreadsheet" }, { symbol: "▥", label: "Ledger" }, { symbol: "▣", label: "Notebook" },
    { symbol: "▧", label: "Binder" }, { symbol: "□", label: "Form" }, { symbol: "▱", label: "Folder" }, { symbol: "⌑", label: "Archive" },
    { symbol: "☷", label: "List" }, { symbol: "≡", label: "Notes" }, { symbol: "¶", label: "Writing" }, { symbol: "§", label: "Policy" },
    { symbol: "A", label: "Text" }, { symbol: "№", label: "Numbered" }, { symbol: "@", label: "Contact" }, { symbol: "⌂", label: "Office" },
    { symbol: "⌇", label: "Timeline" }, { symbol: "[x]", label: "Tasks" }, { symbol: "//", label: "Draft" }, { symbol: "⊞", label: "Calendar" },
    { symbol: "->", label: "Link" }, { symbol: "∷", label: "Index" }, { symbol: "¤", label: "Finance" }, { symbol: "◫", label: "Layout" },
    { symbol: "⊟", label: "Inbox" }, { symbol: "CC", label: "Copy" }, { symbol: "PDF", label: "PDF file" }, { symbol: "XLS", label: "Workbook" },
    { symbol: "DOC", label: "Word document" }, { symbol: "ID", label: "Identity" }, { symbol: "HR", label: "Human resources" }, { symbol: "PR", label: "Public relations" },
    { symbol: "PO", label: "Purchase order" }, { symbol: "CRM", label: "Customer records" }, { symbol: "Q1", label: "Quarterly report" }, { symbol: "FY", label: "Fiscal year" },
  ] },
  { label: "Lab & technology", icons: [
    { symbol: "AT", label: "Atom" }, { symbol: "ENG", label: "Engineering" }, { symbol: "∑", label: "Formula" }, { symbol: "ƒ", label: "Function" },
    { symbol: "∫", label: "Integral" }, { symbol: "∆", label: "Delta" }, { symbol: "λ", label: "Lambda" }, { symbol: "μ", label: "Micro" },
    { symbol: "Ω", label: "Resistance" }, { symbol: "⌬", label: "Chemistry" }, { symbol: "◉", label: "Sensor" }, { symbol: "⊙", label: "Target" },
    { symbol: "⊕", label: "Circuit" }, { symbol: "⎔", label: "Module" }, { symbol: "⟐", label: "Crystal" }, { symbol: "⋈", label: "Network" },
    { symbol: "⌁", label: "Signal" }, { symbol: "≋", label: "Waves" }, { symbol: "∿", label: "Frequency" }, { symbol: "</>", label: "Code" },
    { symbol: "01", label: "Binary" }, { symbol: "AI", label: "Artificial intelligence" }, { symbol: "DB", label: "Database" }, { symbol: "API", label: "API" },
    { symbol: "CPU", label: "Processor" }, { symbol: "GPU", label: "Graphics processor" }, { symbol: "RAM", label: "Memory" }, { symbol: "CLI", label: "Command line" },
    { symbol: "SDK", label: "Developer kit" }, { symbol: "UX", label: "User experience" }, { symbol: "3D", label: "3D model" }, { symbol: "XR", label: "Extended reality" },
    { symbol: "I/O", label: "Input output" }, { symbol: "IP", label: "Network address" }, { symbol: "RF", label: "Radio frequency" }, { symbol: "DNA", label: "Genetics" },
    { symbol: "LAB", label: "Laboratory" }, { symbol: "R&D", label: "Research and development" }, { symbol: "QC", label: "Quality control" }, { symbol: "ML", label: "Machine learning" },
  ] },
] as const;
export const TABLE_ICONS = TABLE_ICON_GROUPS.flatMap((group) => group.icons.map((icon) => icon.symbol));
export function normalizeTableIcon(icon: string | undefined): string { return icon && TABLE_ICONS.includes(icon as (typeof TABLE_ICONS)[number]) ? icon : TABLE_ICONS[0]!; }
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

const PAGE_PREFIX = "__work_sync_page__:";
export function decodePageCell(value: string | boolean | undefined): { title: string; body: string } {
  const raw = typeof value === "string" ? value : "";
  if (raw.startsWith(PAGE_PREFIX)) {
    try { const parsed = JSON.parse(raw.slice(PAGE_PREFIX.length)) as { title?: unknown; body?: unknown }; return { title: typeof parsed.title === "string" ? parsed.title : "", body: typeof parsed.body === "string" ? parsed.body : "" }; } catch { /* treat malformed legacy content as plain text */ }
  }
  return { title: raw.split("\n").find((line) => line.trim())?.trim() ?? "", body: raw };
}
export function encodePageCell(title: string, body: string): string { return `${PAGE_PREFIX}${JSON.stringify({ title, body })}`; }
