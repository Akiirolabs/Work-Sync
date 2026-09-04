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
const todoPage = await readFile(new URL("../src/app/(shell)/todo/page.tsx", import.meta.url), "utf8");
const globalCss = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const userStorage = await readFile(new URL("../src/lib/user-storage.ts", import.meta.url), "utf8");
const notesRoute = await readFile(new URL("../src/app/api/v1/notes/route.ts", import.meta.url), "utf8");
const noteRoute = await readFile(new URL("../src/app/api/v1/notes/[noteId]/route.ts", import.meta.url), "utf8");
const sourcesRoute = await readFile(new URL("../src/app/api/v1/sources/route.ts", import.meta.url), "utf8");
const sourcesPage = await readFile(new URL("../src/app/(shell)/sources/page.tsx", import.meta.url), "utf8");
const sourceFindRoute = await readFile(new URL("../src/app/api/v1/sources/find/route.ts", import.meta.url), "utf8");
const clientApi = await readFile(new URL("../src/lib/client-api.ts", import.meta.url), "utf8");
const macroPanels = await readFile(new URL("../src/components/MacroPanels.tsx", import.meta.url), "utf8");
const macroPanelsCss = await readFile(new URL("../src/components/MacroPanels.module.css", import.meta.url), "utf8");
const macroIcons = await readFile(new URL("../src/components/MacroIcon.tsx", import.meta.url), "utf8");
const agentChat = await readFile(new URL("../src/components/AgentSideChat.tsx", import.meta.url), "utf8");
const agentChatCss = await readFile(new URL("../src/components/AgentSideChat.module.css", import.meta.url), "utf8");
const agentChatRoute = await readFile(new URL("../src/app/api/v1/agent/chat/route.ts", import.meta.url), "utf8");
const userStateRoute = await readFile(new URL("../src/app/api/v1/user-state/route.ts", import.meta.url), "utf8");
const rail = await readFile(new URL("../src/ui/Rail.tsx", import.meta.url), "utf8");
const verifyPage = await readFile(new URL("../src/app/(shell)/verify/page.tsx", import.meta.url), "utf8");
const verifyNoteRoute = await readFile(new URL("../src/app/api/v1/verify-note/route.ts", import.meta.url), "utf8");
const historyPage = await readFile(new URL("../src/app/(shell)/history/page.tsx", import.meta.url), "utf8");
const connectPage = await readFile(new URL("../src/app/(shell)/connect/page.tsx", import.meta.url), "utf8");
const aoCatalog = await readFile(new URL("../src/lib/ao-catalog.ts", import.meta.url), "utf8");
const aoMacro = await readFile(new URL("../src/lib/ao-macro.ts", import.meta.url), "utf8");
const todoModel = await readFile(new URL("../src/lib/todo-model.ts", import.meta.url), "utf8");
const markdownPreview = await readFile(new URL("../src/components/MarkdownPreview.tsx", import.meta.url), "utf8");

test("Verify uses Workspace notes, an evidence chat, and grounded findings", () => {
  assert.match(verifyPage, /api<Note\[]>\("\/api\/v1\/notes"\)/);
  for (const label of ["Workspace source", "Context", "Start Verify", "Verification conversation", "Findings", "How it was checked", "Assertions", "Sources and evidence", "Uncertainty", "Evidence trust score"]) assert.match(verifyPage, new RegExp(label));
  assert.doesNotMatch(verifyPage, /Claims \(CSV \/ JSON\)|Ingest \+ verify/);
  assert.match(verifyPage, /ms-verify-chat-input/);
  assert.match(verifyNoteRoute, /WHERE id = \? AND user_id = \?/);
  assert.match(verifyNoteRoute, /web_search_preview/);
  assert.match(verifyNoteRoute, /provenance/);
  assert.match(verifyNoteRoute, /corroborat/);
  assert.match(verifyNoteRoute, /uncertainty/);
  assert.match(globalCss, /\.ms-verify-messages \{[^}]*overflow-y: auto/);
  assert.match(globalCss, /\.ms-verify-chat-input/);
});

test("Verify requires a complete structured findings response", () => {
  assert.match(verifyNoteRoute, /type: "json_schema", name: "verification_findings", strict: true/);
  assert.match(verifyNoteRoute, /reasoning: \{ effort: "low" \}/);
  assert.match(verifyNoteRoute, /max_output_tokens: 16_000/);
  assert.match(verifyNoteRoute, /status === "incomplete"/);
  assert.match(verifyNoteRoute, /verification provider is rate-limited/);
  assert.match(verifyNoteRoute, /response\.status === 429/);
});

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

test("table and Workspace selectors keep navigation beside their primary controls", () => {
  assert.match(tablesPage, /className="ms-table-picker"/);
  assert.match(tablesPage, /aria-label="Select table"/);
  assert.doesNotMatch(tablesPage, /> Grid </);
  assert.match(tablesPage, /aria-label="Add table"/);
  assert.match(workspacePage, /className="ms-workspace-note-picker"/);
  assert.match(workspacePage, /aria-label="Select Workspace note"/);
  assert.match(globalCss, /\.ms-table-picker \{ width: fit-content;/);
  assert.match(globalCss, /\.ms-workspace-note-picker/);
  assert.match(macroPanels, /const MOBILE_RADIAL_SIZE = 124/);
  assert.match(macroPanels, /window\.matchMedia\("\(max-width: 700px\)"\)/);
  assert.match(macroPanelsCss, /\.dot::after/);
  assert.match(macroPanelsCss, /\.radial \{ width: 124px; height: 124px;/);
  assert.match(macroPanelsCss, /width: 30px; height: 30px/);
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

test("account login omits the create-only name field", () => {
  assert.match(account, /\.\.\.\(mode === "create" \? \{ name: data\.get\("name"\) \} : \{\}\)/);
});

test("logout changes storage identity and user data is scoped", () => {
  assert.match(account, /setActiveStorageUser\(null\)/);
  assert.match(account, /window\.location\.reload\(\)/);
  assert.match(userStorage, /active-user/);
  assert.match(userStorage, /:user:\$\{userId \?\? "signed-out"\}/);
  for (const client of [workspacePage, tablesPage, todoPage, aoMenu, editor]) assert.match(client, /userStorageKey\(/);
});

test("device-local account data is synchronized through an owned server record", () => {
  assert.match(account, /hydrateUserStorage/);
  assert.match(account, /startUserStorageSync/);
  assert.match(userStorage, /\/api\/v1\/user-state/);
  assert.match(userStorage, /TRANSIENT_KEYS/);
  assert.match(userStateRoute, /requestUserId\(req\)/);
  assert.match(userStateRoute, /WHERE user_id = \?/);
  assert.match(userStateRoute, /ON CONFLICT\(user_id\)/);
  assert.match(agentChat, /AGENT_CHAT_STORAGE_KEY/);
});

test("account hydration does not create a reload loop", () => {
  assert.match(account, /Reloading here can[\s\S]*fetch\/reload loop/);
  assert.match(account, /if \(nextUser\) stopSync = startUserStorageSync\(nextUser\.id\)/);
});

test("cloud storage sync absorbs transient network failures and backs off retries", () => {
  assert.match(userStorage, /catch \{[\s\S]*retry quietly instead of producing an unhandled rejection/);
  assert.match(userStorage, /Math\.min\(retryDelay \* 2, 30_000\)/);
  assert.doesNotMatch(userStorage, /uploadUserStorage\(userId\)\.finally\(schedule\)/);
});

test("Workspace notes and sources are constrained to their database owner", () => {
  assert.match(notesRoute, /WHERE user_id IS \?/);
  assert.match(notesRoute, /INSERT INTO workspace_notes \(id, user_id/);
  assert.match(noteRoute, /WHERE id = \? AND user_id IS \?/);
  assert.match(sourcesRoute, /WHERE user_id IS \?/);
  assert.match(sourcesRoute, /INSERT INTO sources \(id, user_id/);
});

test("signed-out Workspace suppresses the raw Unauthorized error", () => {
  assert.match(workspacePage, /e instanceof ApiError && e\.status === 401/);
  assert.match(workspacePage, /Sign in to save notes\./);
  assert.match(clientApi, /res\.status === 401/);
  assert.match(clientApi, /Sign in to continue\./);
});

test("save-and-create macro persists both existing and unsaved Workspace drafts", () => {
  assert.match(aoMenu, /if \(draft\.activeId\) await api<Note>\(`\/api\/v1\/notes\/\$\{draft\.activeId\}`/);
  assert.match(aoMenu, /else await api<Note>\("\/api\/v1\/notes"/);
  assert.match(aoMenu, /return createWorkspaceNote\(get\("title"\)\)/);
});

test("table FTR-1001 interactions are implemented", () => {
  assert.match(tablesPage, /function dropColumn\(source: string, target: string, placement/);
  assert.match(tablesPage, /moveColumn\(current, source, target\)/);
  assert.match(tablesPage, /moveToNextRow\(row\.id, column\.id\)/);
  assert.match(tablesPage, /aria-label="Group table"/);
  assert.match(tablesPage, /groupBy: column\.id/);
  assert.match(editor, /contentEditable/);
  assert.match(editor, /selectionOffsets/);
  assert.match(editor, /previous\.text \+ liveLine\.text/);
  assert.match(editor, /onPaste=\{\(e\) => onPaste\(e, line\)\}/);
  assert.match(editor, /wrapExternalText/);
});

test("table pages use one native multiline control for cross-line selection", () => {
  assert.doesNotMatch(workspacePage, /continuousSelection/);
  assert.match(tablesPage, /storageKey=\{`table-page:[^\n]+continuousSelection/);
  assert.match(editor, /className="ms-continuous-textarea"/);
  assert.match(editor, /aria-label="Continuous line editor"/);
  assert.match(editor, /wrap="off"/);
  assert.match(editor, /setHoveredContinuousLine/);
  assert.match(editor, /hoveredContinuousLine === line\.id/);
  assert.match(editor, /className="ms-line-display"/);
  assert.match(editor, /index \* 27 - continuousScrollTop/);
  assert.match(editor, /setContinuousScrollTop\(event\.currentTarget\.scrollTop\)/);
  assert.match(globalCss, /\.ms-line-display \{/);
  assert.match(globalCss, /\[contenteditable="true"\]/);
  assert.doesNotMatch(globalCss, /> \[contenteditable\](?!\=)/);
});

test("FTR 1009.2 updates Workspace controls, table icons, and Vault text actions", () => {
  assert.match(editor, /if \(kind === "h1" \|\| kind === "h2" \|\| kind === "h3" \|\| kind === "h4"\) \{ const current = linesRef\.current\.find/);
  assert.match(editor, /focusSoon\(id, current\?\.text\.length \?\? 0\)/);
  assert.match(workspacePage, /Saved to cloud/);
  assert.doesNotMatch(workspacePage, /Save as/);
  for (const label of ["Save", "Delete"]) assert.match(workspacePage, new RegExp(label));
  assert.match(workspacePage, /className="ms-workspace-note-more"/);
  assert.match(tablesPage, /function TableIcon/);
  for (const name of ["people", "date", "files", "filter", "group", "appearance", "settings", "comments"]) assert.match(tablesPage, new RegExp(`name="${name}"|${name}:`));
  assert.match(globalCss, /\.ms-ui-icon \{[^}]*color: #fff/);
  assert.match(aoMenu, /className=\{styles\.vaultTextActions\}/);
  assert.match(aoMenu, /Create text preset/);
  assert.match(aoMenu, /View saved text/);
  assert.match(aoMenu, /setVaultTextOnly\(true\)/);
  assert.doesNotMatch(aoMenu, /\["All", "Text"/);
});

test("FTR 1010 provides structured findings, retained histories, Vault isolation, and Timeline", () => {
  assert.match(verifyPage, /MarkdownPreview/);
  assert.match(verifyPage, /Send findings to Workspace/);
  assert.match(verifyPage, /Saved verification chats/);
  assert.match(verifyPage, /Findings history/);
  assert.match(verifyPage, /Send to Workspace/);
  assert.match(verifyPage, /work-sync:verify-chats/);
  assert.match(aoMenu, /vaultTextOnly/);
  assert.match(aoMenu, /View saved text/);
  assert.match(historyPage, /Timeline/);
  assert.match(historyPage, /Calendar/);
  assert.match(historyPage, /Ask Agent/);
  assert.match(historyPage, /Day-linked document workspace/);
  assert.match(historyPage, /TODO_STORAGE_KEY/);
  assert.match(connectPage, /Create Macro/);
  assert.doesNotMatch(connectPage, /ConnectorInfo|connectors|Macro Presets and Vault/);
  assert.match(globalCss, /\.ms-markdown-code/);
  assert.match(globalCss, /\.ms-calendar-grid/);
});

test("Calendar is the named destination for the timeline route", () => {
  assert.match(appShell, /\{ id: "history", label: "Calendar", href: "\/history" \}/);
  assert.match(aoMenu, /\{ label: "Calendar", href: "\/history", icon: "calendar" \}/);
  assert.doesNotMatch(appShell, /label: "History", href: "\/history"/);
});

test("FTR 1011 selects existing objects and keeps mobile rail labels visible", () => {
  assert.match(aoCatalog, /key: "taskId", label: "Existing task", type: "todo"/);
  assert.doesNotMatch(aoCatalog, /text\("taskTitle", "Existing task"/);
  assert.match(todoModel, /const direct = command\.taskId/);
  assert.match(connectPage, /OBJECT_FIELDS/);
  assert.match(connectPage, /Choose an existing object/);
  assert.match(connectPage, /className="ms-create-macro-save"/);
  assert.match(connectPage, />Save to Vault</);
  assert.match(globalCss, /\.ms-create-macro-save:hover, \.ms-create-macro-save:focus-visible/);
  assert.match(globalCss, /\.ms-rail-label \{ display: block; font-size: 8px; \}/);
  assert.match(globalCss, /\.ms-rail-item \{ display: block; overflow: hidden; padding: 8px 4px; font-size: 9px;/);
});

test("FTR 1012.3 turns pasted Markdown into editable Workspace structure", () => {
  assert.doesNotMatch(workspacePage, /MarkdownPreview|Preview Markdown|Edit Markdown/);
  assert.match(workspacePage, /<LineEditor value=\{body\}/);
  for (const structure of ["markdownLines", "hasMarkdownStructure", "kind: \"bullets\"", "kind: \"numbered\"", "kind: \"todo\"", "kind: \"code\""]) assert.match(editor, new RegExp(structure));
  assert.match(editor, /pasteMarkdown\(nextValue/);
});

test("Workspace tables, projects, and Day Documents use the requested self-contained controls", () => {
  assert.match(editor, /function tableCells/);
  assert.match(editor, /function linesToMarkdown/);
  assert.match(editor, /ms-editor-table-row/);
  assert.match(editor, /<span>Table<\/span>/);
  assert.match(workspacePage, /PROJECTS_KEY/);
  assert.match(workspacePage, /ms-workspace-project-picker/);
  assert.match(workspacePage, /Add to project/);
  assert.match(workspacePage, /ms-workspace-menu-new/);
  assert.match(globalCss, /\.ms-workspace-new, \.ms-workspace-save-status \{ display: none; \}/);
  assert.match(historyPage, /Select saved Day Document/);
  assert.match(historyPage, /ms-day-document-meta/);
  assert.match(historyPage, /ms-calendar-document-dot/);
  assert.match(historyPage, /withoutLegacyDayHeading/);
  assert.doesNotMatch(historyPage, /Workspace Note:/);
});

test("FTR 1012.4 restores the heading caret after the formatted line settles", () => {
  assert.match(editor, /A second frame restores the native caret/);
  assert.match(editor, /requestAnimationFrame\(\(\) => \{[\s\S]*requestAnimationFrame\(\(\) => \{/);
  assert.match(editor, /Math\.min\(Math\.max\(offset, 0\), line\.text\.length\)/);
  assert.match(editor, /focusSoon\(id, current\?\.text\.length \?\? 0\)/);
});

test("FTR 1013 preserves saved-note state, caret position, and contained note editing", () => {
  assert.match(workspacePage, /const persistedNote = useRef/);
  assert.match(workspacePage, /const hasUnsavedEdit = persistedNote\.current\.id !== activeId/);
  assert.match(workspacePage, /aria-label="Workspace note options"/);
  assert.match(workspacePage, /async function saveCurrentNote\(\)/);
  assert.doesNotMatch(workspacePage, /Hide saved notes|Show saved notes|saved-notes-panel/);
  assert.match(editor, /function onLineInput/);
  assert.match(editor, /restoreCaret\(line\.id, offset\)/);
  assert.match(editor, /Loading Markdown-shaped note content changes only the editor's structured/);
  assert.match(globalCss, /\.ms-line-editor \{[^}]*overflow: auto/);
  assert.match(globalCss, /\.ms-notes-field \{[^}]*overflow: hidden/);
});

test("FTR 1013 improves Findings, table drag feedback, calendar contrast, and macro layering", () => {
  assert.match(verifyPage, /aria-label="Search Findings history"/);
  assert.match(verifyPage, /visibleFindingHistory/);
  for (const name of ["edit", "duplicate", "summarize", "freeze", "delete", "clipboard", "search"]) assert.match(tablesPage, new RegExp(`name="${name}"|${name}:`));
  assert.match(tablesPage, /columnDropTarget/);
  assert.match(tablesPage, /is-column-drop-\$\{placement\}/);
  assert.match(globalCss, /\.ms-data-grid th\.is-column-drop-before::before/);
  assert.match(globalCss, /::-webkit-calendar-picker-indicator/);
  assert.match(globalCss, /\.ms-calendar-header button \{[^}]*color: #fff/);
  assert.match(macroPanelsCss, /z-index: 2147483647/);
});

test("FTR 1014 researches sources from Workspace Notes and preserves result versions", () => {
  assert.match(sourcesPage, /Workspace Notes/);
  assert.match(sourcesPage, /All Sources/);
  assert.match(sourcesPage, /Saved source results/);
  assert.match(sourcesPage, /work-sync:source-results/);
  assert.match(sourcesPage, /workspaceNoteId/);
  assert.match(sourcesRoute, /workspace_note_id/);
  assert.match(sourceFindRoute, /web_search_preview/);
  assert.match(sourceFindRoute, /OPENAI_API_KEY/);
  assert.match(sourceFindRoute, /most trustworthy, directly relevant sources/);
});

test("Timeline uses real To Do sources below Calendar and preserves branched day documents", () => {
  for (const label of ["All To Do items", "To Do items", "Clear", "Day Documents", "Documents", "Back to Timeline", "Save As", "Associated To Do"]) assert.match(historyPage, new RegExp(label));
  assert.match(historyPage, /updateTodoDate/);
  assert.match(historyPage, /TODO_STORAGE_EVENT/);
  assert.match(historyPage, /setOrganizerTaskIds\(id \? \[id\] : todos\.map/);
  assert.match(historyPage, /todos\.map\(\(todo\) => <option/);
  assert.match(historyPage, /ms-timeline-flow/);
  assert.doesNotMatch(historyPage, /To Do organizer/);
  assert.match(historyPage, /taskMarkdown\(dayTask\)/);
  assert.match(historyPage, /branchOf: activeDocument\?\.id/);
  assert.doesNotMatch(historyPage, /Back to Tomlog|Fixed documents|Markdown preview/);
});

test("Timeline events open their day document with event context", () => {
  assert.match(historyPage, /function openCalendarEvent\(event: CalendarEvent\)/);
  assert.match(historyPage, /setDayEventId\(event\?\.id \?\? null\)/);
  assert.match(historyPage, /className="ms-day-event-context"/);
  assert.match(historyPage, /else openCalendarEvent\(entry\)/);
  assert.match(globalCss, /\.ms-day-task-context, \.ms-day-event-context/);
});

test("Workspace menus and Timeline lists remain reachable without changing calendar behavior", () => {
  assert.match(workspacePage, /aria-haspopup="menu"/);
  assert.match(workspacePage, /data-workspace-note-actions/);
  assert.match(globalCss, /\.ms-workspace-note-menu \{ position: absolute; z-index: 1000/);
  assert.match(editor, /function placeCaret\(/);
  assert.match(globalCss, /\.ms-editor-line:has\(\.ms-line-menu\) \{ z-index: 100/);
  assert.match(globalCss, /\.ms-line-menu \{ position: absolute; z-index: 1000;[^}]*pointer-events: auto/);
  assert.match(historyPage, /aria-label="Scrollable To Do items"/);
  assert.match(historyPage, /aria-label="Scrollable Day Documents"/);
  assert.match(historyPage, /ms-day-document-actions/);
  assert.match(globalCss, /\.ms-organizer-list \{ display: grid; max-height: 278px;[^}]*overflow-y: auto/);
  assert.match(globalCss, /\.ms-day-document-history \{ max-height: 278px; overflow-y: auto/);
});

test("Select options support create, reorder, recolor, delete and macro pretext saving", () => {
  assert.match(tablesPage, /Type an option and press Enter/);
  assert.match(tablesPage, /text\/select-option/);
  assert.match(tablesPage, /SELECT_COLORS\.map/);
  assert.match(tablesPage, /createPortal\(<div className="ms-option-editor"/);
  assert.match(tablesPage, /rect\.right \+ 7/);
  assert.match(tablesPage, /onScroll=\{\(\) => setEditing\(null\)\}/);
  assert.match(tablesPage, /Delete option/);
  assert.match(tablesPage, /Save as macro pretext/);
  assert.match(tablesPage, /AO_MACROS_KEY/);
  assert.match(tablesPage, /setColumnOptions/);
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
  for (const label of ["Macro", "Route", "Turbo", "Vault", "Preferences", "Presets", "Search macros", "Create text preset", "Create macro", "Open Vault", "Write in Workspace", "Make a new table", "Run macro"]) assert.match(aoMenu, new RegExp(label));
  assert.match(aoMenu, /AO_MACROS_KEY/);
  assert.match(aoMenu, /AO_TABLE_COMMAND_KEY/);
  assert.match(aoMenu, /AO_WORKSPACE_TEXT_KEY/);
  assert.match(aoMenu, /function PreferencesGear\(\)/);
  assert.match(aoMenu, /<PreferencesGear \/>/);
  assert.match(aoMenu, /document\.addEventListener\("pointerdown", dismiss\)/);
  assert.match(aoMenu, /event\.key !== "Escape"/);
  assert.doesNotMatch(aoMenu, /<span>M<\/span>|<span>R<\/span>|<span>T<\/span>/);
  for (const label of ["Macro information", "Route information", "Turbo information"]) assert.match(aoMenu, new RegExp(label));
  assert.match(aoCss, /content: attr\(data-tip\)/);
  assert.match(aoMenu, /AO_MACRO_CATALOG\.length/);
  assert.match(aoMenu, /createWorkspaceNote\(get\("title"\)\)/);
  assert.match(aoMenu, /See, run and manage all saved text and custom macros/);
  assert.match(aoMenu, /type === "textarea"/);
  assert.match(aoMenu, /value: "__new_page__"/);
});

test("AO preset browser is gated behind Presets and every preset can be saved", () => {
  assert.match(aoMenu, /macroMode === "home"/);
  assert.match(aoMenu, /setMacroMode\("presets"\)/);
  assert.match(aoMenu, /macroMode === "presets"/);
  assert.match(aoMenu, /aria-label="Presets information"/);
  assert.match(aoMenu, /aria-label="Text preset information"/);
  assert.match(aoMenu, /<VaultIcon \/><b>Create macro<\/b><MacroIcon name="chevron"/);
  assert.match(aoMenu, /saveBuiltIn\(macro\)/);
  assert.match(aoMenu, /\? "Saved" : "Save"/);
  assert.match(aoMenu, /macroId: macro\.id/);
});

test("AO builds reusable multi-step macros and stores them in Vault", () => {
  assert.match(aoMenu, /type MacroMode = "home" \| "presets" \| "builder"/);
  assert.match(aoMenu, /Add built-in preset elements to create a reusable sequence/);
  assert.match(aoMenu, /Save macro to Vault/);
  assert.match(aoMenu, /steps: builderSteps\.map/);
  assert.match(aoMenu, /action: "batch", commands/);
  assert.match(aoMenu, /Run custom macro/);
  assert.match(aoCss, /\.builderPanel/);
});

test("Vault uses its atom as the information affordance and keeps navigation arrow behavior", () => {
  assert.match(aoMenu, /<VaultIcon info \/><b>Vault<\/b><MacroIcon name="chevron"/);
  assert.match(aoMenu, /className=\{`\$\{styles\.vaultIcon\}\$\{info \? ` \$\{styles\.vaultInfo\}`/);
  assert.match(aoCss, /\.vaultInfo:hover::after/);
  assert.doesNotMatch(aoMenu, /<span className=\{styles\.infoMark\}[^>]*aria-label="Vault information"/);
});

test("Vault manages typed entries and a six-item draggable Main Macro row", () => {
  assert.match(aoMenu, /MAIN_MACRO_LIMIT = 6/);
  assert.match(aoMenu, /className=\{styles\.vaultItems\}/);
  assert.match(aoCss, /\.vaultItems \{ max-height: 371px; overflow-y: auto/);
  assert.match(aoMenu, /data-vault-chevron/);
  assert.match(aoMenu, /<MacroIcon name=\{isTextPreset\(preset\) \? "text" : "macro"\}/);
  assert.match(aoMenu, /Add to Main Macro/);
  assert.match(aoMenu, /macroIconFor\(preset\.macroId, Boolean\(preset\.steps\?\.length\), preset\.icon\)/);
  assert.match(aoMenu, /Choose Macro Panel icon for/);
  assert.match(aoMenu, /setPresetIcon\(menuPreset, icon\.name\)/);
  assert.match(aoMenu, /MACRO_ICON_OPTIONS/);
  for (const label of ["Code", "Terminal", "Database", "Cloud", "Code branch", "Build", "Tools", "Book", "Study", "Lab", "Idea"]) assert.match(macroIcons, new RegExp(label));
  assert.doesNotMatch(aoMenu, /MAIN_MACRO_ICONS|mainIconPrompt|chooseMainIcon/);
  assert.match(aoMenu, /icon: undefined/);
  assert.match(aoMenu, /VAULT_CATEGORIES/);
  assert.match(aoMenu, /dataTransfer\.setData\("text\/main-macro"/);
  assert.match(aoMenu, /onMouseEnter=\{\(event\) => showMainTooltip/);
  assert.match(aoMenu, /createPortal\(<div className=\{styles\.mainMacroTooltip\}/);
  assert.match(aoMenu, /role="tooltip"/);
  assert.match(aoCss, /\.mainMacroTooltip \{ position: fixed; z-index: 2147483647;/);
  assert.doesNotMatch(aoMenu, /<small>\{preset\.label\}<\/small>/);
  assert.match(aoMenu, /reorderMainPreset\(source, preset\.id\)/);
  assert.match(aoMenu, /deleteVaultPreset\(menuPreset\)/);
  assert.match(aoMenu, /Delete<\/button>/);
});

test("macro cards use fast explicit vector icons and responsive hover targets", () => {
  assert.match(macroPanels, /<MacroIcon name=\{macroIconFor\(item\.macroId/);
  assert.match(macroPanels, /<small role="tooltip">\{item\.label\}<\/small>/);
  assert.doesNotMatch(macroPanels, /title=\{item\.label\}/);
  assert.match(macroPanelsCss, /\.radialButtons button::before \{[^}]*inset: -5px/);
  assert.match(macroPanelsCss, /transition: opacity 35ms/);
  assert.match(macroPanelsCss, /button:hover small, \.radialButtons button:focus-visible small/);
  assert.match(macroPanelsCss, /color: #fff/);
});

test("AO commands are consumed once by their destination pages", () => {
  assert.match(tablesPage, /localStorage\.removeItem\(userStorageKey\(AO_TABLE_COMMAND_KEY\)\)/);
  assert.match(tablesPage, /applyTableMacro\(current, activeId, command\)/);
  assert.match(tablesPage, /data-ao-cell/);
  assert.match(tablesPage, /setFocusCell\(result\.focusCell\)/);
  assert.match(workspacePage, /localStorage\.removeItem\(userStorageKey\(AO_WORKSPACE_TEXT_KEY\)\)/);
  assert.match(workspacePage, /window\.addEventListener\(AO_WORKSPACE_TEXT_EVENT, consumeAOText\)/);
  assert.match(todoPage, /localStorage\.removeItem\(userStorageKey\(AO_TODO_COMMAND_KEY\)\)/);
  assert.match(todoPage, /window\.addEventListener\(AO_TODO_COMMAND_EVENT, consume\)/);
});

test("To Do is a functional left-panel destination with task macros", () => {
  assert.match(appShell, /label: "To Do", href: "\/todo"/);
  assert.match(todoPage, /createTodo\(title, "normal", dueDate \|\| undefined, description\)/);
  assert.match(todoPage, /aria-label="New task due date"/);
  assert.match(todoPage, /className="ms-todo-title-row"/);
  assert.match(todoPage, /className="ms-todo-menu-date"/);
  assert.match(todoPage, /createPortal\(<form className="ms-todo-menu"/);
  assert.match(todoPage, /style=\{\{ left: taskMenu\.left, top: taskMenu\.top \}\}/);
  assert.match(globalCss, /\.ms-todo-menu \{ position: fixed; z-index: 2147483640;/);
  assert.match(globalCss, /\.ms-todo-menu \{ width: min\(320px, calc\(100vw - 20px\)\); max-width: calc\(100vw - 20px\); min-width: 0; \}/);
  assert.match(globalCss, /\.ms-todo-menu-date \{ width: 100%; max-width: 100%; \}/);
  assert.match(globalCss, /\.ms-todo-menu-date input\[type="date"\] \{ display: block; width: calc\(100% - 18px\); min-width: 0; max-width: calc\(100% - 18px\); min-inline-size: 0; inline-size: calc\(100% - 18px\); max-inline-size: calc\(100% - 18px\); padding-right: 7px;/);
  assert.match(globalCss, /\.ms-todo-menu-date input\[type="date"\]::\-webkit\-datetime\-edit, \.ms-todo-menu-date input\[type="date"\]::\-webkit\-datetime\-edit-fields-wrapper \{ padding: 0; \}/);
  assert.match(todoPage, /className="ms-todo-disclosure"/);
  assert.match(todoPage, /expandedTasks\[item\.id\] && <div className="ms-todo-detail"/);
  assert.match(globalCss, /\.ms-todo-disclosure\[aria-expanded="true"\]/);
  assert.match(todoPage, /Complete \$\{item\.title\}/);
  assert.match(todoPage, /Clear completed/);
  assert.match(aoMenu, /selected\.category === "To Do"/);
  assert.match(aoMenu, /sendTodoCommand/);
  assert.match(todoPage, /aria-label=\{`Description for \$\{item\.title\}`\}/);
  assert.match(todoPage, /aria-label=\{`New subtask for \$\{item\.title\}`\}/);
  assert.match(todoPage, /aria-label=\{`Subtask description for \$\{item\.title\}`\}/);
  assert.match(todoPage, /Complete subtask/);
  assert.match(todoPage, /Delete subtask/);
  assert.match(aoMenu, /subtaskDescription: context\.subtaskDescription/);
  assert.match(todoPage, /data-todo-menu-toggle/);
  assert.match(todoPage, /className="ms-todo-menu"/);
  assert.match(todoPage, /Task title/);
  assert.match(todoPage, /type="date"/);
  assert.match(todoPage, /closest\("\[data-todo-menu\]"/);
  assert.match(aoMenu, /field\.type === "date" \? "date"/);
  assert.match(globalCss, /\.ms-workspace:has\(\.ms-todo-panel\) \{ overflow: hidden; \}/);
  assert.match(globalCss, /\.ms-todo-panel \{[\s\S]*?flex: 1;[\s\S]*?min-height: 0;[\s\S]*?overflow: hidden;/);
  assert.match(globalCss, /\.ms-todo-list \{[\s\S]*?flex: 1;[\s\S]*?min-height: 0;[\s\S]*?padding: 0 6px 16px 0;[\s\S]*?overflow-y: auto;/);
  assert.match(globalCss, /\.ms-todo-item \{ flex: 0 0 auto; \}/);
});

test("To Do organizes tasks into saved lists while keeping an all-task Overview", () => {
  assert.match(todoModel, /TODO_LIST_STORAGE_KEY = "work-sync:todo-lists"/);
  assert.match(todoModel, /listId\?: string/);
  assert.match(todoPage, /<span>Folders<\/span><select aria-label="Select To Do list"/);
  assert.match(todoPage, /<option value="">Overview<\/option>/);
  assert.match(todoPage, /\+ Create task list/);
  assert.match(todoPage, /listId: activeListId/);
  assert.match(todoPage, /localStorage\.setItem\(userStorageKey\(TODO_LIST_STORAGE_KEY\)/);
  assert.match(globalCss, /\.ms-todo-list-picker \{/);
  assert.match(todoPage, /overviewMode === "folders"/);
  assert.match(todoPage, /Choose a folder to see the To Dos it contains/);
  assert.match(todoPage, /Unfiled To Dos/);
  assert.match(globalCss, /\.ms-todo-folder-overview \{/);
  assert.match(todoPage, /aria-label="Folder options"/);
  assert.match(todoPage, /Rename folder/);
  assert.match(todoPage, /aria-label="Rename task list"/);
  assert.match(todoPage, /function renameTaskList/);
  assert.match(globalCss, /\.ms-todo-folder-menu \{/);
});

test("Workspace note actions import and export CSV and Word documents", () => {
  assert.match(workspacePage, /import JSZip from "jszip"/);
  assert.match(workspacePage, /Import CSV or Word/);
  assert.match(workspacePage, /Export CSV/);
  assert.match(workspacePage, /Export Word \(\.docx\)/);
  assert.match(workspacePage, /accept="\.csv,\.docx,\.txt,\.md/);
  assert.match(workspacePage, /docxAsWorkspaceText/);
  assert.match(workspacePage, /createDocx/);
  assert.match(globalCss, /\.ms-visually-hidden \{/);
});

test("two Macro Panel entrances expose no more than six Vault shortcuts", () => {
  assert.match(appShell, /<MacroPanels onAgent=/);
  assert.match(macroPanels, /const LIMIT = 6/);
  assert.match(macroPanels, /event\.ctrlKey && event\.key\.toLowerCase\(\) === "m"/);
  assert.match(macroPanels, /className=\{styles\.dot\}/);
  assert.match(macroPanels, /aria-label="Circular Macro Panel"/);
  assert.match(macroPanels, /AO_RUN_MAIN_MACRO_EVENT/);
});

test("circular Macro Panel stays open across navigation and moves from its AO center", () => {
  assert.match(macroPanels, /aria-label="Move circular Macro Panel"/);
  assert.match(macroPanels, /setPointerCapture/);
  assert.match(macroPanels, /document\.addEventListener\("pointermove", moveDrag\)/);
  assert.match(macroPanels, /document\.addEventListener\("pointerup", endDrag\)/);
  assert.match(macroPanels, /RADIAL_POSITION_KEY/);
  assert.match(macroPanels, /sessionStorage\.setItem\(RADIAL_OPEN_KEY/);
  assert.match(macroPanels, /sessionStorage\.getItem\(RADIAL_OPEN_KEY\) === "true"/);
  assert.match(macroPanels, /localStorage\.setItem\(userStorageKey\(RADIAL_POSITION_KEY\)/);
  assert.match(macroPanels, /aria-label="Toggle circular Macro Panel"/);
  assert.doesNotMatch(macroPanels, /setRadialOpen\(false\)/);
  assert.match(macroPanels, /<MacroButtons items=\{items\} radial onShowTooltip=\{showRadialTooltip\}/);
  assert.match(macroPanels, /createPortal\(<div className=\{styles\.radialTooltip\}/);
  assert.match(rail, /import Link from "next\/link"/);
  assert.match(rail, /<Link key=\{item\.id\}/);
});

test("the circular Macro Panel uses a reduced-motion-safe liquid chrome center", () => {
  assert.match(macroPanels, /className=\{styles\.liquidChrome\}/);
  assert.doesNotMatch(macroPanels, /aria-label="Move circular Macro Panel"[^>]*>AO</);
  assert.match(macroPanelsCss, /\.liquidChrome \{/);
  assert.match(macroPanelsCss, /@keyframes liquidChromeFlow/);
  assert.match(macroPanelsCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(macroPanelsCss, /\.radialButtons button/);
});

test("Agent is a simple authenticated streaming text side chat", () => {
  assert.match(appShell, /className="ms-ao-agent-button"/);
  assert.match(appShell, /className="ms-ao-agent-menu"/);
  assert.match(appShell, /Hide AO Agent/);
  assert.match(appShell, /className="ms-ao-agent-restore"/);
  assert.match(appShell, /src="\/ao-agent\.png"/);
  assert.match(appShell, /aria-label="Open AO Agent menu"/);
  assert.match(globalCss, /\.ms-ao-agent-launcher \{ position: fixed; z-index: 649; right: 15px; bottom: 15px; \}/);
  assert.match(globalCss, /\.ms-ao-agent-button \{ width: 40px; height: 40px; display: grid; place-items: center; padding: 0; border: 0; background: transparent; box-shadow: none;/);
  assert.match(agentChatRoute, /requestUserId\(req\)/);
  assert.match(agentChatRoute, /model: "gpt-5-mini"/);
  assert.match(agentChatRoute, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(agentChatRoute, /tools: \[\]/);
  assert.match(agentChatRoute, /stream: true/);
  assert.match(agentChat, /aria-label="AO Agent side chat"/);
  assert.match(agentChat, /Open AO Agent chat history/);
  assert.match(agentChat, /Send an Agent output/);
  assert.match(agentChat, /Select an Agent response to send/);
  assert.match(agentChat, /Workspace Notes.*To Do.*Tables page.*Verify/);
  assert.match(aoMacro, /agent-output-page/);
  assert.match(verifyPage, /work-sync:agent-verify-context/);
  assert.match(agentChat, /aria-label="Agent conversation"/);
  assert.match(agentChat, /aria-label="Message AO Agent"/);
  assert.match(agentChat, /response\.output_text\.delta/);
  assert.match(agentChat, /scrollIntoView/);
  assert.match(agentChat, /gpt-5-mini · text chat · no tools/);
  assert.doesNotMatch(agentChat, /getUserMedia|RTCPeerConnection|Start voice/);
  assert.match(agentChatCss, /grid-column: 3/);
});
