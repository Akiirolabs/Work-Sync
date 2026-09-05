import assert from "node:assert/strict";
import test from "node:test";
import { AO_MACRO_CATALOG, AO_MACRO_CATEGORIES } from "../src/lib/ao-catalog.ts";

test("AO provides the accepted catalog of runnable presets", () => {
  assert.ok(AO_MACRO_CATALOG.length >= 104);
  assert.deepEqual(AO_MACRO_CATEGORIES, ["Workspace", "To Do", "Tables", "Rows", "Columns", "Pages", "Vault", "Flows"]);
  assert.equal(new Set(AO_MACRO_CATALOG.map((macro) => macro.id)).size, AO_MACRO_CATALOG.length);
});

test("catalog includes every property type and time-saving chained workflows", () => {
  assert.equal(AO_MACRO_CATALOG.filter((macro) => macro.action === "column-add").length, 18);
  for (const id of ["workspace-new", "workspace-new-preset", "todo-add", "todo-add-detailed", "todo-add-with-subtask", "todo-add-subtask", "todo-set-description", "todo-add-high", "todo-add-due", "todo-clear-completed", "table-project", "table-lab", "row-page", "page-column-first", "page-open", "vault-create", "vault-run"]) assert.ok(AO_MACRO_CATALOG.some((macro) => macro.id === id), id);
  assert.ok(AO_MACRO_CATALOG.some((macro) => (macro.fields?.length ?? 0) >= 3));
  assert.equal(AO_MACRO_CATALOG.some((macro) => macro.action === "vault-delete"), false);
  assert.equal(AO_MACRO_CATALOG.find((macro) => macro.id === "todo-add-due")?.fields?.find((field) => field.key === "dueDate")?.type, "date");
});

test("every catalog preset maps to a supported execution action", () => {
  const supported = {
    Workspace: new Set(["workspace-new", "workspace-new-preset", "workspace-template", "workspace-open", "workspace-prepend", "workspace-add-comment", "workspace-add-heading", "workspace-add-code"]),
    "To Do": new Set(["todo-add", "todo-add-detailed", "todo-add-with-subtask", "todo-add-high-with-subtask", "todo-add-subtask", "todo-set-description", "todo-add-high", "todo-add-today", "todo-add-due", "todo-open", "todo-from-note", "todo-from-note-content", "todo-complete-next", "todo-clear-completed"]),
    Tables: new Set(["table-create", "table-template", "table-open", "table-rename", "table-duplicate"]),
    Rows: new Set(["row-add", "row-many", "row-named", "row-duplicate", "row-page", "row-preset", "row-empty"]),
    Columns: new Set(["column-add", "column-rename", "column-duplicate", "column-change", "column-insert-left", "column-insert-right", "column-hide", "column-show", "column-options", "column-summary", "column-filter"]),
    Pages: new Set(["page-create", "page-open", "page-column-first", "row-page", "page-rename", "page-append", "page-duplicate", "page-fill-empty"]),
    Vault: new Set(["vault-create", "vault-run", "vault-find", "vault-pin", "vault-duplicate", "vault-rename", "vault-edit", "vault-recent"]),
    Flows: new Set(["flow-add-note", "flow-note-project", "flow-project-note", "flow-verify-note", "flow-verify-context", "flow-verify-sources", "flow-todo-workspace", "flow-folder-task-subtask", "flow-folder-select-task", "flow-folder-task-subtask-existing", "flow-folder-task-subtask-details", "flow-finding-day", "flow-sources-day", "flow-sources-workspace", "flow-finding-table", "flow-sources-table", "flow-todo-calendar", "flow-todo-day", "flow-todo-to-day", "flow-note-to-day"]),
  };

  for (const macro of AO_MACRO_CATALOG) {
    assert.ok(supported[macro.category]?.has(macro.action), `${macro.id} has unsupported action ${macro.action}`);
    for (const field of macro.fields ?? []) {
      assert.ok(field.key.trim(), `${macro.id} has a field without a key`);
      assert.ok(field.label.trim(), `${macro.id}.${field.key} has no label`);
    }
  }
});

test("cross-workspace flow presets require saved-object selectors", () => {
  for (const id of ["flow-note-project", "flow-verify-note", "flow-verify-context", "flow-verify-sources", "flow-todo-workspace", "flow-finding-day", "flow-sources-day", "flow-finding-table", "flow-sources-table", "flow-todo-calendar", "flow-todo-to-day", "flow-note-to-day"]) {
    const macro = AO_MACRO_CATALOG.find((item) => item.id === id);
    assert.ok(macro, id);
    assert.ok(macro.fields?.some((field) => ["note", "todo", "finding", "source-result", "table", "day-document"].includes(field.type)), `${id} needs a selector`);
  }
});
