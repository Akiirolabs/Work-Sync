import assert from "node:assert/strict";
import test from "node:test";
import { AO_MACRO_CATALOG, AO_MACRO_CATEGORIES } from "../src/lib/ao-catalog.ts";

test("AO provides the accepted catalog of at least 50 runnable presets", () => {
  assert.equal(AO_MACRO_CATALOG.length, 72);
  assert.deepEqual(AO_MACRO_CATEGORIES, ["Workspace", "Tables", "Rows", "Columns", "Pages", "Vault"]);
  assert.equal(new Set(AO_MACRO_CATALOG.map((macro) => macro.id)).size, AO_MACRO_CATALOG.length);
});

test("catalog includes every property type and time-saving chained workflows", () => {
  assert.equal(AO_MACRO_CATALOG.filter((macro) => macro.action === "column-add").length, 18);
  for (const id of ["workspace-new", "workspace-new-preset", "table-project", "table-lab", "row-page", "page-column-first", "page-open", "vault-create", "vault-run"]) assert.ok(AO_MACRO_CATALOG.some((macro) => macro.id === id), id);
  assert.ok(AO_MACRO_CATALOG.some((macro) => (macro.fields?.length ?? 0) >= 3));
});
