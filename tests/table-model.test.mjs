import assert from "node:assert/strict";
import test from "node:test";
import { TABLE_ICON_GROUPS, addColumn, addRow, changeColumnType, decodePageCell, deleteColumn, duplicateColumn, duplicateTable, encodePageCell, hideColumn, insertColumn, makeTable, normalizeTableIcon, showColumn, updateCell } from "../src/lib/table-model.ts";

test("creates a themed table with five columns and three rows", () => {
  const table = makeTable(1);
  assert.equal(table.name, "Table");
  assert.equal(table.icon, "▤");
  assert.equal(table.columns.length, 5);
  assert.equal(table.rows.length, 3);
});

test("adds records and persists cell values immutably", () => {
  const table = addRow(makeTable(1));
  const row = table.rows[0]; const column = table.columns[0];
  assert.ok(row && column);
  const updated = updateCell(table, row.id, column.id, "Launch");
  assert.equal(updated.rows[0]?.cells[column.id], "Launch");
  assert.equal(table.rows[0]?.cells[column.id], undefined);
  assert.equal(updated.rows.length, 4);
});

test("adds, edits, duplicates, inserts, and deletes columns", () => {
  let table = makeTable(1);
  table = addColumn(table, "checkbox");
  const checkbox = table.columns.at(-1);
  assert.equal(checkbox?.type, "checkbox");
  table = changeColumnType(table, checkbox.id, "email");
  assert.equal(table.columns.at(-1)?.type, "email");
  table = insertColumn(table, checkbox.id, "left");
  assert.equal(table.columns.at(-2)?.name, "Text");
  table = insertColumn(table, checkbox.id, "right");
  const beforeDuplicate = table.columns.length;
  table = duplicateColumn(table, checkbox.id);
  assert.equal(table.columns.length, beforeDuplicate + 1);
  assert.equal(table.columns.at(-1)?.name, `${checkbox.name} copy`);
  table = deleteColumn(table, checkbox.id);
  assert.equal(table.columns.some((column) => column.id === checkbox.id), false);
});

test("hides and restores columns without hiding the final visible column", () => {
  let table = makeTable(1);
  const ids = table.columns.map((column) => column.id);
  for (const columnId of ids.slice(0, -1)) table = hideColumn(table, columnId);
  table = hideColumn(table, ids.at(-1));
  assert.equal(table.columns.filter((column) => !column.hidden).length, 1);
  table = showColumn(table, ids[0]);
  assert.equal(table.columns.filter((column) => !column.hidden).length, 2);
});

test("duplicates a table with independent identifiers and remapped data", () => {
  let table = makeTable(1); const row = table.rows[0]; const column = table.columns[0];
  table = updateCell(table, row.id, column.id, "Copied value");
  const copy = duplicateTable(table, "Table copy");
  assert.notEqual(copy.id, table.id);
  assert.notEqual(copy.columns[0]?.id, column.id);
  assert.equal(copy.rows[0]?.cells[copy.columns[0].id], "Copied value");
  assert.equal(copy.name, "Table copy");
});

test("stores page content only in its exact row and column cell", () => {
  let table = addColumn(makeTable(1), "page");
  const pageColumn = table.columns.at(-1); const firstRow = table.rows[0]; const secondRow = table.rows[1];
  assert.ok(pageColumn && firstRow && secondRow);
  table = updateCell(table, firstRow.id, pageColumn.id, "Page title\nPrivate page body");
  assert.equal(table.rows[0]?.cells[pageColumn.id], "Page title\nPrivate page body");
  assert.equal(table.rows[1]?.cells[pageColumn.id], undefined);
  for (const column of table.columns.slice(0, -1)) assert.equal(table.rows[0]?.cells[column.id], undefined);
});

test("stores a renameable page title separately from its body", () => {
  const encoded = encodePageCell("Experiment 42", "First observation\nSecond observation");
  assert.deepEqual(decodePageCell(encoded), { title: "Experiment 42", body: "First observation\nSecond observation" });
  assert.deepEqual(decodePageCell("Legacy title\nLegacy body"), { title: "Legacy title", body: "Legacy title\nLegacy body" });
});

test("offers categorized office and lab technology table icons", () => {
  assert.deepEqual(TABLE_ICON_GROUPS.map((group) => group.label), ["Office", "Lab & technology"]);
  assert.ok(TABLE_ICON_GROUPS.flatMap((group) => group.icons).length >= 70);
  assert.ok(TABLE_ICON_GROUPS[0].icons.some((icon) => icon.label === "Office"));
  assert.ok(TABLE_ICON_GROUPS[1].icons.some((icon) => icon.label === "Artificial intelligence"));
  assert.equal(TABLE_ICON_GROUPS.flatMap((group) => group.icons).some((icon) => /\p{Extended_Pictographic}/u.test(icon.symbol)), false);
  assert.equal(normalizeTableIcon("📋"), "▤");
  assert.equal(normalizeTableIcon("AI"), "AI");
});
