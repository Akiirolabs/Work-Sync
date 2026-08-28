import { addColumn, addRow, makeTable, updateCell, type WorkTable } from "./table-model";

export const AO_MACROS_KEY = "work-sync:ao-macros";
export const AO_TABLE_COMMAND_KEY = "work-sync:ao-table-command";
export const AO_WORKSPACE_TEXT_KEY = "work-sync:ao-workspace-text";
export const AO_TABLE_COMMAND_EVENT = "work-sync:ao-table-command";
export const AO_WORKSPACE_TEXT_EVENT = "work-sync:ao-workspace-text";

export type AOTableCommand =
  | { action: "add-table"; text?: string }
  | { action: "add-row" }
  | { action: "add-column" };

export type AOMacroPreset = { id: string; label: string; text: string };

export function applyTableMacro(
  tables: WorkTable[],
  activeId: string,
  command: AOTableCommand,
): { tables: WorkTable[]; activeId: string } {
  if (command.action === "add-table") {
    let next = makeTable(tables.length + 1);
    if (command.text?.trim()) {
      next = { ...next, name: "Turbo" };
      next = updateCell(next, next.rows[0]!.id, next.columns[0]!.id, command.text.trim());
    }
    return { tables: [...tables, next], activeId: next.id };
  }

  const selectedId = tables.some((table) => table.id === activeId) ? activeId : tables[0]?.id;
  if (!selectedId) return { tables, activeId };
  return {
    tables: tables.map((table) => {
      if (table.id !== selectedId) return table;
      return command.action === "add-row" ? addRow(table) : addColumn(table, "text");
    }),
    activeId: selectedId,
  };
}
