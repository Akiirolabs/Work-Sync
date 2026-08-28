import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const model = await readFile(new URL("../src/lib/ao-macro.ts", import.meta.url), "utf8");

test("AO table macros map to concrete table model operations", () => {
  assert.match(model, /command\.action === "add-table"/);
  assert.match(model, /addRow\(table\)/);
  assert.match(model, /addColumn\(table, "text"\)/);
  assert.match(model, /updateCell\(next, next\.rows\[0\]!\.id, next\.columns\[0\]!\.id, command\.text\.trim\(\)\)/);
});

test("Turbo table text is scoped to the newly-created table", () => {
  assert.match(model, /next = \{ \.\.\.next, name: "Turbo" \}/);
  assert.match(model, /return \{ tables: \[\.\.\.tables, next\], activeId: next\.id \}/);
});
