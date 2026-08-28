import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { applyTableMacro } from "../src/lib/ao-macro.ts";
import { decodePageCell, makeTable } from "../src/lib/table-model.ts";

const model = await readFile(new URL("../src/lib/ao-macro.ts", import.meta.url), "utf8");

test("AO table macros map to concrete table model operations", () => {
  assert.match(model, /"table-create", "table-template"/);
  assert.match(model, /updated = addRow\(updated\)/);
  assert.match(model, /updated = addColumn\(updated, safeType\(command\.type\)\)/);
  assert.match(model, /updateCell\(next, next\.rows\[0\]!\.id, next\.columns\[0\]!\.id, command\.text\.trim\(\)\)/);
});

test("Turbo table text is scoped to the newly-created table", () => {
  assert.match(model, /next = \{ \.\.\.next, name: "Turbo" \}/);
  assert.match(model, /return \{ tables: \[\.\.\.tables, next\], activeId: next\.id \}/);
});

test("table macros include templates, page workflows and chained UI results", () => {
  for (const marker of ["TEMPLATE_COLUMNS", "row-page", "page-column-first", "page-fill-empty", "openPage", "openColumn", "filter", "summary"]) assert.match(model, new RegExp(marker));
});

test("executes table templates and multi-row macros", () => {
  const initial = makeTable(1);
  const templated = applyTableMacro([initial], initial.id, { action: "table-template", template: "lab", name: "Trials" });
  assert.equal(templated.tables[1]?.name, "Trials");
  assert.deepEqual(templated.tables[1]?.columns.map((column) => column.name), ["Experiment", "Researcher", "Date", "Result", "Files", "Lab Page"]);
  const expanded = applyTableMacro(templated.tables, templated.activeId, { action: "row-many", tableId: templated.activeId, count: 4 });
  assert.equal(expanded.tables[1]?.rows.length, 7);
});

test("creates a page column, stores its title, and requests the scoped page modal", () => {
  const initial = makeTable(1);
  const result = applyTableMacro([initial], initial.id, { action: "page-column-first", tableId: initial.id, name: "Research Page", title: "Trial 42" });
  const table = result.tables[0];
  const pageColumn = table.columns.at(-1);
  assert.equal(pageColumn?.type, "page");
  assert.deepEqual(result.openPage, { rowId: table.rows[0].id, columnId: pageColumn.id });
  assert.equal(decodePageCell(table.rows[0].cells[pageColumn.id]).title, "Trial 42");
});

test("chained row-page macros can create a missing Page column automatically", () => {
  const initial = makeTable(1);
  const result = applyTableMacro([initial], initial.id, { action: "row-page", tableId: initial.id, columnId: "__new_page__", name: "Trial", title: "Trial page" });
  const table = result.tables[0];
  const pageColumn = table.columns.at(-1);
  assert.equal(pageColumn?.type, "page");
  assert.equal(table.rows.length, 4);
  assert.equal(decodePageCell(table.rows.at(-1).cells[pageColumn.id]).title, "Trial page");
  assert.deepEqual(result.openPage, { rowId: table.rows.at(-1).id, columnId: pageColumn.id });
});

test("next-empty-row macro returns a precise cell focus target", () => {
  const initial = makeTable(1);
  const result = applyTableMacro([initial], initial.id, { action: "row-empty", tableId: initial.id, columnId: initial.columns[0].id });
  assert.deepEqual(result.focusCell, { rowId: initial.rows[0].id, columnId: initial.columns[0].id });
});

test("custom macro batches execute every saved table step in order", () => {
  const initial = makeTable(1);
  const result = applyTableMacro([initial], initial.id, {
    action: "batch",
    commands: [
      { action: "table-rename", tableId: initial.id, name: "Research" },
      { action: "row-many", tableId: initial.id, count: 2 },
      { action: "column-add", tableId: initial.id, type: "page", name: "Lab notes" },
    ],
  });
  assert.equal(result.tables[0].name, "Research");
  assert.equal(result.tables[0].rows.length, 5);
  assert.deepEqual(result.tables[0].columns.at(-1), {
    id: result.tables[0].columns.at(-1).id,
    name: "Lab notes",
    type: "page",
  });
});
