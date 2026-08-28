import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tablesPage = await readFile(new URL("../src/app/(shell)/tables/page.tsx", import.meta.url), "utf8");
const account = await readFile(new URL("../src/components/AccountSettings.tsx", import.meta.url), "utf8");
const editor = await readFile(new URL("../src/components/LineEditor.tsx", import.meta.url), "utf8");
const orbCss = await readFile(new URL("../src/ui/LiquidChromeOrb.module.css", import.meta.url), "utf8");
const appShell = await readFile(new URL("../src/components/AppShell.tsx", import.meta.url), "utf8");
const aoMenu = await readFile(new URL("../src/components/AOMacroMenu.tsx", import.meta.url), "utf8");
const aoCss = await readFile(new URL("../src/components/AOMacroMenu.module.css", import.meta.url), "utf8");
const workspacePage = await readFile(new URL("../src/app/(shell)/page.tsx", import.meta.url), "utf8");
const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

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
  assert.match(tablesPage, /aria-label="Column name"/);
  assert.match(tablesPage, /onRename=/);
});

test("column menus are portal-rendered and anchored to the opening chevron", () => {
  assert.match(tablesPage, /getBoundingClientRect\(\)/);
  assert.match(tablesPage, /createPortal\(<ColumnActions/);
  assert.match(tablesPage, /rect\.bottom \+ 5/);
});

test("page cells use the Workspace editor in a dismissible cell-scoped modal", () => {
  assert.match(tablesPage, /<LineEditor value=\{pageDocument\.body\}/);
  assert.match(tablesPage, /aria-label="Close page"/);
  assert.match(tablesPage, /aria-label="Page title"/);
  assert.match(tablesPage, /data-table-popup/);
  assert.match(tablesPage, /event\.target === event\.currentTarget/);
  assert.match(tablesPage, /table-page:\$\{table\.id\}:\$\{pageRow\.id\}:\$\{pageColumn\.id\}/);
});

test("all app popups support click-away dismissal", () => {
  assert.match(tablesPage, /document\.addEventListener\("pointerdown", dismissPopups\)/);
  assert.match(tablesPage, /setOpenPage\(null\)/);
  assert.match(editor, /document\.addEventListener\("pointerdown", dismissLineMenu\)/);
  assert.match(account, /event\.target === event\.currentTarget/);
});

test("AO replaces the badge overlay without scanning or animating Next internals", () => {
  assert.match(appShell, /<AOMacroMenu \/>/);
  assert.doesNotMatch(appShell, /NextBadgeAtom/);
  assert.doesNotMatch(aoMenu, /nextjs-portal|shadowRoot|MutationObserver|requestAnimationFrame/);
  assert.match(aoCss, /position: fixed/);
  assert.match(aoCss, /left: 16px/);
  assert.match(aoCss, /border-radius: 50%/);
  assert.doesNotMatch(aoCss, /animation:/);
  assert.doesNotMatch(aoCss, /\.logo::before|\.logo::after/);
  assert.match(aoMenu, /<svg viewBox="0 0 32 32"/);
  assert.match(nextConfig, /devIndicators: false/);
});

test("AO menu exposes functional Macro, Route, Turbo and Preferences views", () => {
  for (const label of ["Macro", "Route", "Turbo", "Vault", "Preferences", "Search macros", "Create text preset", "Write in Workspace", "Make a new table", "Run macro"]) assert.match(aoMenu, new RegExp(label));
  assert.match(aoMenu, /AO_MACROS_KEY/);
  assert.match(aoMenu, /AO_TABLE_COMMAND_KEY/);
  assert.match(aoMenu, /AO_WORKSPACE_TEXT_KEY/);
  assert.match(aoMenu, /document\.addEventListener\("pointerdown", dismiss\)/);
  assert.match(aoMenu, /event\.key === "Escape"/);
  assert.doesNotMatch(aoMenu, /<span>M<\/span>|<span>R<\/span>|<span>T<\/span>/);
  for (const label of ["Macro information", "Route information", "Turbo information"]) assert.match(aoMenu, new RegExp(label));
  assert.match(aoCss, /content: attr\(data-tip\)/);
  assert.match(aoMenu, /AO_MACRO_CATALOG\.length/);
  assert.match(aoMenu, /createWorkspaceNote\(valueFor\("title"\)\)/);
  assert.match(aoMenu, /See, run and manage all saved macros at a glance/);
  assert.match(aoMenu, /type === "textarea"/);
  assert.match(aoMenu, /value: "__new_page__"/);
});

test("AO commands are consumed once by their destination pages", () => {
  assert.match(tablesPage, /localStorage\.removeItem\(AO_TABLE_COMMAND_KEY\)/);
  assert.match(tablesPage, /applyTableMacro\(current, activeId, command\)/);
  assert.match(tablesPage, /data-ao-cell/);
  assert.match(tablesPage, /setFocusCell\(result\.focusCell\)/);
  assert.match(workspacePage, /localStorage\.removeItem\(AO_WORKSPACE_TEXT_KEY\)/);
  assert.match(workspacePage, /window\.addEventListener\(AO_WORKSPACE_TEXT_EVENT, consumeAOText\)/);
});
