export type AOMacroCategory = "Workspace" | "To Do" | "Tables" | "Rows" | "Columns" | "Pages" | "Vault";
export type AOMacroFieldType = "text" | "textarea" | "number" | "date" | "table" | "column" | "column-type" | "row" | "page-column" | "page" | "preset" | "note" | "todo" | "heading" | "destination";
export type AOMacroField = { key: string; label: string; type: AOMacroFieldType; placeholder?: string; optional?: boolean };
export type AOMacroDefinition = { id: string; label: string; description: string; category: AOMacroCategory; action: string; fields?: AOMacroField[]; value?: string };

const text = (key: string, label: string, placeholder: string, optional = false): AOMacroField => ({ key, label, type: "text", placeholder, optional });
const date = (key: string, label: string): AOMacroField => ({ key, label, type: "date" });
const table: AOMacroField = { key: "tableId", label: "Table", type: "table" };
const column: AOMacroField = { key: "columnId", label: "Column", type: "column" };
const row: AOMacroField = { key: "rowId", label: "Row", type: "row" };
const pageColumn: AOMacroField = { key: "columnId", label: "Page column", type: "page-column" };
const page: AOMacroField = { key: "page", label: "Page", type: "page" };
const preset: AOMacroField = { key: "presetId", label: "Saved preset", type: "preset" };
const note: AOMacroField = { key: "noteId", label: "Saved note", type: "note" };

const workspace: AOMacroDefinition[] = [
  { id: "workspace-new", label: "New blank note", description: "Create and open a separate Workspace note.", category: "Workspace", action: "workspace-new", fields: [text("title", "Note title", "Untitled note")] },
  { id: "workspace-new-preset", label: "New note from text preset", description: "Create a separate note using saved Vault text.", category: "Workspace", action: "workspace-new-preset", fields: [text("title", "Note title", "Untitled note"), preset] },
  { id: "workspace-meeting", label: "New meeting note", description: "Create a structured meeting note.", category: "Workspace", action: "workspace-template", value: "meeting", fields: [text("title", "Meeting title", "Weekly meeting")] },
  { id: "workspace-project", label: "New project note", description: "Create a structured project outline.", category: "Workspace", action: "workspace-template", value: "project", fields: [text("title", "Project name", "Project name")] },
  { id: "workspace-open", label: "Open Saved Note", description: "Select and open an existing Workspace note by exact title.", category: "Workspace", action: "workspace-open", fields: [note] },
  { id: "workspace-duplicate", label: "Duplicate Current Note", description: "Create a separate duplicate of the current note.", category: "Workspace", action: "workspace-duplicate", fields: [text("title", "Duplicate title", "Duplicated note")] },
  { id: "workspace-append", label: "Append saved text", description: "Add Vault text to the end of the current note.", category: "Workspace", action: "workspace-append", fields: [preset] },
  { id: "workspace-prepend", label: "Add Saved Text to Current Note", description: "Add selected Vault text to the start of the current note.", category: "Workspace", action: "workspace-prepend", fields: [preset] },
  { id: "workspace-section", label: "Add Title with Current Date to Current Note", description: "Append a dated title to the current note.", category: "Workspace", action: "workspace-section", fields: [text("title", "Title", "Update")] },
  { id: "workspace-save-new", label: "Save and create another note", description: "Save the draft, then create a separate note.", category: "Workspace", action: "workspace-save-new", fields: [text("title", "New note title", "Untitled note")] },
  { id: "workspace-add-text", label: "Add Text to Workspace", description: "Append supplied text to the current Workspace note.", category: "Workspace", action: "workspace-add-text", fields: [{ key: "text", label: "Text", type: "textarea", placeholder: "Text to add" }] },
  { id: "workspace-add-comment", label: "Add Comment to Current Workspace", description: "Attach a comment to the current Workspace content.", category: "Workspace", action: "workspace-add-comment", fields: [{ key: "comment", label: "Comment", type: "textarea", placeholder: "Comment text" }] },
  { id: "workspace-add-heading", label: "Add Text with Heading to Workspace", description: "Insert supplied text using a selected Workspace heading level.", category: "Workspace", action: "workspace-add-heading", fields: [{ key: "heading", label: "Heading level", type: "heading" }, { key: "text", label: "Heading text", type: "textarea", placeholder: "Heading text" }] },
  { id: "workspace-add-code", label: "Add Code to Workspace", description: "Insert supplied text using Workspace code formatting.", category: "Workspace", action: "workspace-add-code", fields: [{ key: "text", label: "Code", type: "textarea", placeholder: "Code or command" }] },
];

const todo: AOMacroDefinition[] = [
  { id: "todo-add", label: "Add task", description: "Add a task to the To Do page.", category: "To Do", action: "todo-add", fields: [text("title", "Task", "What needs to be done?")] },
  { id: "todo-add-detailed", label: "Add task with description", description: "Create a task with supporting details.", category: "To Do", action: "todo-add-detailed", fields: [text("title", "Task", "What needs to be done?"), { key: "description", label: "Description", type: "textarea", placeholder: "Context, requirements or notes" }] },
  { id: "todo-add-with-subtask", label: "Add task with first subtask", description: "Create a detailed task and its first next step.", category: "To Do", action: "todo-add-with-subtask", fields: [text("title", "Task", "Task name"), { key: "description", label: "Task description", type: "textarea", placeholder: "Task context", optional: true }, text("subtaskTitle", "First subtask", "First next step"), { key: "subtaskDescription", label: "Subtask description", type: "textarea", placeholder: "Subtask details", optional: true }] },
  { id: "todo-add-high-with-subtask", label: "Add priority task with subtask", description: "Create a high-priority task with an immediate next step.", category: "To Do", action: "todo-add-high-with-subtask", fields: [text("title", "Priority task", "Important task"), { key: "description", label: "Task description", type: "textarea", placeholder: "Why this is important", optional: true }, text("subtaskTitle", "First subtask", "Immediate next step"), { key: "subtaskDescription", label: "Subtask description", type: "textarea", placeholder: "How to complete this step", optional: true }] },
  { id: "todo-add-subtask", label: "Add subtask to existing task", description: "Find an existing task by name and append a detailed subtask.", category: "To Do", action: "todo-add-subtask", fields: [text("taskTitle", "Existing task", "Exact or partial task name"), text("subtaskTitle", "Subtask", "Next step"), { key: "subtaskDescription", label: "Subtask description", type: "textarea", placeholder: "Details for this step", optional: true }] },
  { id: "todo-set-description", label: "Set task description", description: "Add or replace the description on an existing task.", category: "To Do", action: "todo-set-description", fields: [text("taskTitle", "Existing task", "Exact or partial task name"), { key: "description", label: "Description", type: "textarea", placeholder: "Task details" }] },
  { id: "todo-add-high", label: "Add high-priority task", description: "Add an important task to the To Do page.", category: "To Do", action: "todo-add-high", fields: [text("title", "Task", "Important task")] },
  { id: "todo-add-today", label: "Add task due today", description: "Create a task with today's due date.", category: "To Do", action: "todo-add-today", fields: [text("title", "Task", "Task due today")] },
  { id: "todo-add-due", label: "Add task with due date", description: "Create a task with a selected due date.", category: "To Do", action: "todo-add-due", fields: [text("title", "Task", "Scheduled task"), date("dueDate", "Due date")] },
  { id: "todo-open", label: "Open Saved To-Do", description: "Select an existing To-Do item by exact title.", category: "To Do", action: "todo-open", fields: [{ key: "taskId", label: "Saved To-Do", type: "todo" }] },
  { id: "todo-from-note", label: "Create To-Do From Saved Note", description: "Create a To-Do using a saved note title.", category: "To Do", action: "todo-from-note", fields: [note] },
  { id: "todo-from-note-content", label: "Add To-Do From Saved Note With Content", description: "Create a To-Do from a note and turn each content line into a subtask.", category: "To Do", action: "todo-from-note-content", fields: [note] },
  { id: "todo-complete-next", label: "Complete next task", description: "Mark the first open task complete.", category: "To Do", action: "todo-complete-next" },
  { id: "todo-clear-completed", label: "Clear completed tasks", description: "Remove every completed task from To Do.", category: "To Do", action: "todo-clear-completed" },
];

const tables: AOMacroDefinition[] = [
  { id: "table-blank", label: "Create blank table", description: "Create and open a named table.", category: "Tables", action: "table-create", fields: [text("name", "Table name", "New table")] },
  { id: "table-template", label: "Create table from template", description: "Create a table from a saved schema.", category: "Tables", action: "table-template", value: "project", fields: [text("name", "Table name", "Project tracker")] },
  { id: "table-open", label: "Open table", description: "Jump to an existing table.", category: "Tables", action: "table-open", fields: [table] },
  { id: "table-rename", label: "Rename table", description: "Rename an existing table.", category: "Tables", action: "table-rename", fields: [table, text("name", "New name", "Table name")] },
  { id: "table-duplicate", label: "Duplicate table", description: "Copy a table and its data.", category: "Tables", action: "table-duplicate", fields: [table, text("name", "Copy name", "Table copy")] },
  { id: "table-project", label: "Create project tracker", description: "Status, owner, due date, priority and page.", category: "Tables", action: "table-template", value: "project", fields: [text("name", "Table name", "Project tracker")] },
  { id: "table-meeting", label: "Create meeting tracker", description: "Date, attendees, topic, page and follow-up.", category: "Tables", action: "table-template", value: "meeting", fields: [text("name", "Table name", "Meeting tracker")] },
  { id: "table-lab", label: "Create laboratory log", description: "Experiment, researcher, result, files and lab page.", category: "Tables", action: "table-template", value: "lab", fields: [text("name", "Table name", "Laboratory log")] },
  { id: "table-content", label: "Create content calendar", description: "Platform, status, publish date, owner and content page.", category: "Tables", action: "table-template", value: "content", fields: [text("name", "Table name", "Content calendar")] },
  { id: "table-issues", label: "Create issue tracker", description: "Severity, assignee, status and investigation page.", category: "Tables", action: "table-template", value: "issues", fields: [text("name", "Table name", "Issue tracker")] },
];

const rows: AOMacroDefinition[] = [
  { id: "row-add", label: "Add one row", description: "Append a record to a table.", category: "Rows", action: "row-add", fields: [table] },
  { id: "row-many", label: "Add multiple rows", description: "Append several records at once.", category: "Rows", action: "row-many", fields: [table, { key: "count", label: "Number of rows", type: "number" }] },
  { id: "row-named", label: "Add named row", description: "Create a row and fill its first cell.", category: "Rows", action: "row-named", fields: [table, text("name", "Row name", "New record")] },
  { id: "row-duplicate", label: "Duplicate row", description: "Copy a row and all its cells.", category: "Rows", action: "row-duplicate", fields: [table, row] },
  { id: "row-page", label: "Add row and open its page", description: "Create a row, create its page, then open it.", category: "Rows", action: "row-page", fields: [table, pageColumn, text("title", "Page title", "Untitled page")] },
  { id: "row-preset", label: "Add row from saved text", description: "Create a named row from Vault text.", category: "Rows", action: "row-preset", fields: [table, preset] },
  { id: "row-empty", label: "Move to next empty row", description: "Open the first empty record in a selected column.", category: "Rows", action: "row-empty", fields: [table, column] },
];

const columnTypes = [
  ["text", "Text"], ["number", "Number"], ["percent", "Percent"], ["currency", "Currency"], ["single", "Single Select"], ["multiple", "Multiple Select"], ["date", "Date"], ["people", "People"], ["files", "Image & Files"], ["checkbox", "Checkbox"], ["reaction", "Reaction"], ["formula", "Formula"], ["relation", "Relation"], ["rollup", "Rollup"], ["page", "Page"], ["url", "URL"], ["phone", "Phone"], ["email", "Email"],
] as const;
const addColumns: AOMacroDefinition[] = columnTypes.map(([value, label]) => ({ id: `column-add-${value}`, label: `Add ${label} column`, description: `Add and name a ${label} property.`, category: "Columns", action: "column-add", value, fields: [table, text("name", "Column name", label)] }));
const columnActions: AOMacroDefinition[] = [
  { id: "column-rename", label: "Rename column", description: "Rename a selected property.", category: "Columns", action: "column-rename", fields: [table, column, text("name", "New name", "Column name")] },
  { id: "column-duplicate", label: "Duplicate column", description: "Copy a column and its values.", category: "Columns", action: "column-duplicate", fields: [table, column] },
  { id: "column-change", label: "Change column type", description: "Convert a column to another property type.", category: "Columns", action: "column-change", fields: [table, column, { key: "type", label: "New property type", type: "column-type" }] },
  { id: "column-left", label: "Insert column left", description: "Insert Text to the left of a column.", category: "Columns", action: "column-insert-left", fields: [table, column] },
  { id: "column-right", label: "Insert column right", description: "Insert Text to the right of a column.", category: "Columns", action: "column-insert-right", fields: [table, column] },
  { id: "column-hide", label: "Hide column", description: "Hide a visible property.", category: "Columns", action: "column-hide", fields: [table, column] },
  { id: "column-show", label: "Show hidden column", description: "Restore a hidden property.", category: "Columns", action: "column-show", fields: [table, column] },
  { id: "column-options", label: "Open column options", description: "Open the selected property menu.", category: "Columns", action: "column-options", fields: [table, column] },
  { id: "column-summary", label: "Summarize column", description: "Show a count summary for a property.", category: "Columns", action: "column-summary", fields: [table, column] },
  { id: "column-filter", label: "Filter by column", description: "Open a filter for the selected property.", category: "Columns", action: "column-filter", fields: [table, column, text("query", "Filter text", "Search value")] },
];

const pages: AOMacroDefinition[] = [
  { id: "page-create", label: "Create page in existing row", description: "Create and open a page in one exact cell.", category: "Pages", action: "page-create", fields: [table, row, pageColumn, text("title", "Page title", "Untitled page")] },
  { id: "page-open", label: "Open existing page", description: "Find and open a saved table page.", category: "Pages", action: "page-open", fields: [page] },
  { id: "page-column-first", label: "Add Page column and first page", description: "Add a Page property and open its first page.", category: "Pages", action: "page-column-first", fields: [table, text("name", "Column name", "Page"), text("title", "Page title", "Untitled page")] },
  { id: "page-row", label: "Add row with page", description: "Create a named row and open its new page.", category: "Pages", action: "row-page", fields: [table, pageColumn, text("name", "Row name", "New record"), text("title", "Page title", "Untitled page")] },
  { id: "page-rename", label: "Rename page", description: "Rename an existing table page.", category: "Pages", action: "page-rename", fields: [page, text("title", "New title", "Page title")] },
  { id: "page-append", label: "Append saved text to page", description: "Add Vault text to a table page.", category: "Pages", action: "page-append", fields: [page, preset] },
  { id: "page-duplicate", label: "Duplicate page into another row", description: "Copy page title and content to another row.", category: "Pages", action: "page-duplicate", fields: [page, { key: "destinationRowId", label: "Destination row", type: "row" }] },
  { id: "page-fill-empty", label: "Create pages for empty rows", description: "Create titled pages in every empty Page cell.", category: "Pages", action: "page-fill-empty", fields: [table, pageColumn, text("title", "Title prefix", "Page")] },
];

const vault: AOMacroDefinition[] = [
  { id: "vault-create", label: "Create text preset", description: "Save reusable text in Vault.", category: "Vault", action: "vault-create", fields: [text("name", "Preset name", "Weekly update"), { key: "text", label: "Preset text", type: "textarea", placeholder: "Reusable text" }] },
  { id: "vault-run", label: "Run saved text preset", description: "Send Vault text to a chosen destination.", category: "Vault", action: "vault-run", fields: [preset, { key: "destination", label: "Destination", type: "destination" }] },
  { id: "vault-find", label: "Find saved macro", description: "Search all saved Vault entries.", category: "Vault", action: "vault-find" },
  { id: "vault-pin", label: "Pin macro", description: "Keep a Vault entry at the top.", category: "Vault", action: "vault-pin", fields: [preset] },
  { id: "vault-duplicate", label: "Duplicate saved macro", description: "Create an editable copy of a Vault entry.", category: "Vault", action: "vault-duplicate", fields: [preset, text("name", "Copy name", "Preset copy")] },
  { id: "vault-rename", label: "Rename saved macro", description: "Change a Vault entry name.", category: "Vault", action: "vault-rename", fields: [preset, text("name", "New name", "Preset name")] },
  { id: "vault-edit", label: "Edit saved macro", description: "Replace a Vault entry's reusable text.", category: "Vault", action: "vault-edit", fields: [preset, { key: "text", label: "New text", type: "textarea", placeholder: "Reusable text" }] },
  { id: "vault-recent", label: "Recently used macros", description: "Show the latest runnable Vault entries.", category: "Vault", action: "vault-recent" },
];

export const AO_MACRO_CATEGORIES: AOMacroCategory[] = ["Workspace", "To Do", "Tables", "Rows", "Columns", "Pages", "Vault"];
export const AO_MACRO_CATALOG: AOMacroDefinition[] = [...workspace, ...todo, ...tables, ...rows, ...addColumns, ...columnActions, ...pages, ...vault];
