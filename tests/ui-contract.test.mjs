import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tablesPage = await readFile(new URL("../src/app/(shell)/tables/page.tsx", import.meta.url), "utf8");
const account = await readFile(new URL("../src/components/AccountSettings.tsx", import.meta.url), "utf8");
const editor = await readFile(new URL("../src/components/LineEditor.tsx", import.meta.url), "utf8");
const orbCss = await readFile(new URL("../src/ui/LiquidChromeOrb.module.css", import.meta.url), "utf8");
const favicon = await readFile(new URL("../src/app/icon.svg", import.meta.url), "utf8");
const faviconAnimator = await readFile(new URL("../src/components/AnimatedFavicon.tsx", import.meta.url), "utf8");
const atomArtwork = await readFile(new URL("../src/ui/atomArtwork.ts", import.meta.url), "utf8");

test("uses the animated atom in settings and Ask AI", () => {
  assert.match(account, /<LiquidChromeOrb size=\{17\}/);
  assert.match(editor, /<LiquidChromeOrb size=\{16\} title="Ask AI"/);
  assert.match(orbCss, /\.artwork > svg/);
  assert.match(editor, /LiquidChromeOrb/);
  assert.match(favicon, /class="atom"/);
  assert.match(favicon, /animation: atom-spin/);
  assert.match(favicon, /prefers-reduced-motion/);
  assert.match(faviconAnimator, /requestAnimationFrame\(draw\)/);
  assert.match(faviconAnimator, /prefers-reduced-motion: reduce/);
  assert.match(faviconAnimator, /data:image\/svg\+xml/);
  assert.match(faviconAnimator, /renderAtomSvg\(atomFrameAt\(time\)\)/);
  assert.match(atomArtwork, /ms-atom-chrome/);
  assert.match(atomArtwork, /ms-atom-a/);
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
