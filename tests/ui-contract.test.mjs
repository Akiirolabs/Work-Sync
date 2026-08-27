import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tablesPage = await readFile(new URL("../src/app/(shell)/tables/page.tsx", import.meta.url), "utf8");
const account = await readFile(new URL("../src/components/AccountSettings.tsx", import.meta.url), "utf8");
const editor = await readFile(new URL("../src/components/LineEditor.tsx", import.meta.url), "utf8");
const orbCss = await readFile(new URL("../src/ui/LiquidChromeOrb.module.css", import.meta.url), "utf8");

test("uses the animated atom in settings and Ask AI", () => {
  assert.match(account, /<LiquidChromeOrb size=\{17\}/);
  assert.match(editor, /<LiquidChromeOrb size=\{16\} title="Ask AI"/);
  assert.match(orbCss, /animation: ms-chrome-spin/);
  assert.match(orbCss, /animation: ms-orbit-a/);
});

test("table ellipsis exposes the exact compact menu actions", () => {
  for (const label of ["Copy link", "Rename", "Duplicate", "Delete"]) assert.match(tablesPage, new RegExp(label));
  assert.match(tablesPage, /Change icon for/);
  assert.match(tablesPage, /Choose icon for/);
});

test("column chevrons expose every referenced action", () => {
  for (const label of ["Edit column", "Duplicate column", "Insert left", "Insert right", "Filter column", "Summarize column", "Freeze up to this column", "Hide column", "Delete column", "View more actions"]) assert.match(tablesPage, new RegExp(label));
});

test("column menus are portal-rendered and anchored to the opening chevron", () => {
  assert.match(tablesPage, /getBoundingClientRect\(\)/);
  assert.match(tablesPage, /createPortal\(<ColumnActions/);
  assert.match(tablesPage, /rect\.bottom \+ 5/);
});
