export const TODO_STORAGE_KEY = "work-sync:todos";
export const TODO_STORAGE_EVENT = "work-sync:todo-updated";
export const AO_TODO_COMMAND_KEY = "work-sync:ao-todo-command";
export const AO_TODO_COMMAND_EVENT = "work-sync:ao-todo-command";

export type TodoPriority = "normal" | "high";
export type TodoSubtask = { id: string; title: string; description?: string; completed: boolean; subtasks?: TodoSubtask[] };
export type TodoItem = { id: string; title: string; description?: string; subtasks?: TodoSubtask[]; completed: boolean; priority: TodoPriority; dueDate?: string; createdAt: string };
export type AOTodoCommand = { action: string; title?: string; taskId?: string; taskTitle?: string; description?: string; subtaskTitle?: string; subtaskDescription?: string; subtasks?: string[]; dueDate?: string; commands?: AOTodoCommand[] };

const makeId = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);

export function createSubtask(title: string, description?: string): TodoSubtask | null {
  const cleanTitle = title.trim(); if (!cleanTitle) return null;
  return { id: makeId(), title: cleanTitle, description: description?.trim() || undefined, completed: false };
}

export function createTodo(title: string, priority: TodoPriority = "normal", dueDate?: string, description?: string, subtasks: TodoSubtask[] = []): TodoItem | null {
  const cleanTitle = title.trim(); if (!cleanTitle) return null;
  return { id: makeId(), title: cleanTitle, description: description?.trim() || undefined, subtasks, completed: false, priority, dueDate: dueDate?.trim() || undefined, createdAt: new Date().toISOString() };
}

function reorder<T extends { id: string }>(items: T[], sourceId: string, targetId: string): T[] {
  const from = items.findIndex((item) => item.id === sourceId); const to = items.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved!); return next;
}

export function moveTodo(items: TodoItem[], sourceId: string, targetId: string, position: "before" | "after" = "before"): TodoItem[] {
  const from = items.findIndex((item) => item.id === sourceId); const target = items.findIndex((item) => item.id === targetId);
  if (from < 0 || target < 0 || from === target) return items;
  const next = [...items]; const [moved] = next.splice(from, 1); let to = next.findIndex((item) => item.id === targetId); if (position === "after") to += 1; next.splice(to, 0, moved!); return next;
}
export function moveSubtask(items: TodoItem[], taskId: string, sourceId: string, targetId: string): TodoItem[] {
  return items.map((item) => item.id === taskId ? { ...item, subtasks: reorder(item.subtasks ?? [], sourceId, targetId) } : item);
}

export function applyTodoCommand(items: TodoItem[], command: AOTodoCommand): TodoItem[] {
  if (command.action === "todo-batch") return (command.commands ?? []).reduce(applyTodoCommand, items);
  if (command.action === "todo-clear-completed") return items.filter((item) => !item.completed);
  if (command.action === "todo-complete-next") {
    const next = items.find((item) => !item.completed); return next ? items.map((item) => item.id === next.id ? { ...item, completed: true } : item) : items;
  }
  if (command.action === "todo-add-subtask" || command.action === "todo-set-description") {
    const target = command.taskTitle?.trim().toLowerCase(); const direct = command.taskId ? items.find((item) => item.id === command.taskId) : undefined; if (!direct && !target) return items;
    const exact = target ? items.find((item) => item.title.toLowerCase() === target) : undefined; const match = direct ?? exact ?? (target ? items.find((item) => item.title.toLowerCase().includes(target)) : undefined); if (!match) return items;
    if (command.action === "todo-set-description") return items.map((item) => item.id === match.id ? { ...item, description: command.description?.trim() || undefined } : item);
    const subtask = createSubtask(command.subtaskTitle ?? "", command.subtaskDescription); return subtask ? items.map((item) => item.id === match.id ? { ...item, subtasks: [...(item.subtasks ?? []), subtask] } : item) : items;
  }
  const priority: TodoPriority = command.action === "todo-add-high" ? "high" : "normal";
  const dueDate = command.action === "todo-add-today" ? today() : command.dueDate;
  if (command.action === "todo-follow-up" || command.action === "todo-review") { const item = createTodo(`${command.action === "todo-follow-up" ? "Follow up: " : "Review: "}${command.title ?? ""}`); return item ? [...items, item] : items; }
  if (["todo-add", "todo-add-high", "todo-add-today", "todo-add-due", "todo-add-detailed", "todo-add-with-subtask", "todo-add-high-with-subtask", "todo-from-note", "todo-from-note-content"].includes(command.action)) {
    const firstSubtask = createSubtask(command.subtaskTitle ?? "", command.subtaskDescription);
    const noteSubtasks = (command.subtasks ?? []).map((title) => createSubtask(title)).filter((item): item is TodoSubtask => Boolean(item));
    const item = createTodo(command.title ?? "", command.action === "todo-add-high-with-subtask" ? "high" : priority, dueDate, command.description, firstSubtask ? [firstSubtask, ...noteSubtasks] : noteSubtasks); return item ? [...items, item] : items;
  }
  return items;
}
