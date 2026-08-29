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
const clientApi = await readFile(new URL("../src/lib/client-api.ts", import.meta.url), "utf8");
const macroPanels = await readFile(new URL("../src/components/MacroPanels.tsx", import.meta.url), "utf8");
const voiceAgent = await readFile(new URL("../src/components/VoiceAgentPanel.tsx", import.meta.url), "utf8");
const voiceAgentCss = await readFile(new URL("../src/components/VoiceAgentPanel.module.css", import.meta.url), "utf8");
const realtimeCall = await readFile(new URL("../src/app/api/v1/realtime/call/route.ts", import.meta.url), "utf8");

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

test("table FTR-1001 interactions are implemented", () => {
  assert.match(tablesPage, /moveColumn\(current, source, column\.id\)/);
  assert.match(tablesPage, /moveToNextRow\(row\.id, column\.id\)/);
  assert.match(tablesPage, /aria-label="Group table"/);
  assert.match(tablesPage, /groupBy: column\.id/);
  assert.match(editor, /contentEditable/);
  assert.match(editor, /selectionOffsets/);
  assert.match(editor, /previous\.text \+ liveLine\.text/);
  assert.match(editor, /onPaste=\{\(e\) => onPaste\(e, line\)\}/);
  assert.match(editor, /wrapExternalText/);
});

test("Workspace and table pages use one native multiline control for cross-line selection", () => {
  assert.match(workspacePage, /continuousSelection/);
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
  assert.match(aoMenu, /<VaultIcon \/><b>Create macro<\/b><em>›<\/em>/);
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
  assert.match(aoMenu, /<VaultIcon info \/><b>Vault<\/b><em>›<\/em>/);
  assert.match(aoMenu, /className=\{`\$\{styles\.vaultIcon\}\$\{info \? ` \$\{styles\.vaultInfo\}`/);
  assert.match(aoCss, /\.vaultInfo:hover::after/);
  assert.doesNotMatch(aoMenu, /<span className=\{styles\.infoMark\}[^>]*aria-label="Vault information"/);
});

test("Vault manages typed entries and a six-item draggable Main Macro row", () => {
  assert.match(aoMenu, /MAIN_MACRO_LIMIT = 6/);
  assert.match(aoMenu, /className=\{styles\.vaultItems\}/);
  assert.match(aoCss, /\.vaultItems \{ max-height: 371px; overflow-y: auto/);
  assert.match(aoMenu, /data-vault-chevron/);
  assert.match(aoMenu, /isTextPreset\(preset\) \? "T" : "M"/);
  assert.match(aoMenu, /Add to Main Macro/);
  assert.match(aoMenu, /className=\{styles\.mainIconGrid\}/);
  assert.match(aoMenu, /mainIconPrompt === menuPreset\.id/);
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
  assert.match(todoPage, /createTodo\(title, "normal", undefined, description\)/);
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

test("two Macro Panel entrances expose no more than six Vault shortcuts", () => {
  assert.match(appShell, /<MacroPanels onAgent=/);
  assert.match(macroPanels, /const LIMIT = 6/);
  assert.match(macroPanels, /event\.ctrlKey && event\.key\.toLowerCase\(\) === "m"/);
  assert.match(macroPanels, /className=\{styles\.dot\}/);
  assert.match(macroPanels, /aria-label="Circular Macro Panel"/);
  assert.match(macroPanels, /AO_RUN_MAIN_MACRO_EVENT/);
});

test("voice Agent uses authenticated WebRTC Realtime calls with cleanup and transcripts", () => {
  assert.match(realtimeCall, /requestUserId\(req\)/);
  assert.match(realtimeCall, /gpt-realtime-2\.1-mini/);
  assert.match(realtimeCall, /type: "semantic_vad"/);
  assert.match(realtimeCall, /tools: \[\]/);
  assert.match(realtimeCall, /https:\/\/api\.openai\.com\/v1\/realtime\/calls/);
  assert.match(voiceAgent, /new RTCPeerConnection\(\)/);
  assert.match(voiceAgent, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(voiceAgent, /response\.cancel/);
  assert.match(voiceAgent, /output_audio_buffer\.clear/);
  assert.match(voiceAgent, /conversation\.item\.input_audio_transcription\.completed/);
  assert.match(voiceAgent, /conversation\.item\.input_audio_transcription\.delta/);
  assert.match(voiceAgent, /aria-label="Voice Agent side chat"/);
  assert.match(voiceAgent, /aria-label="Voice conversation transcript"/);
  assert.match(voiceAgent, /scrollIntoView/);
  assert.match(voiceAgent, /gpt-realtime-2\.1-mini · live voice · no tools/);
  assert.doesNotMatch(voiceAgent, /aria-modal="true"/);
  assert.match(voiceAgentCss, /grid-column: 3/);
  assert.match(voiceAgent, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
});
