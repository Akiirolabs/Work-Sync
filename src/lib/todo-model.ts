export const TODO_STORAGE_KEY = "work-sync:todos";
export const AO_TODO_COMMAND_KEY = "work-sync:ao-todo-command";
export const AO_TODO_COMMAND_EVENT = "work-sync:ao-todo-command";

export type TodoPriority = "normal" | "high";
export type TodoSubtask = { id: string; title: string; description?: string; completed: boolean };
export type TodoItem = { id: string; title: string; description?: string; subtasks?: TodoSubtask[]; completed: boolean; priority: TodoPriority; dueDate?: string; createdAt: string };
export type AOTodoCommand = { action: string; title?: string; taskTitle?: string; description?: string; subtaskTitle?: string; subtaskDescription?: string; dueDate?: string; commands?: AOTodoCommand[] };

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

export function applyTodoCommand(items: TodoItem[], command: AOTodoCommand): TodoItem[] {
  if (command.action === "todo-batch") return (command.commands ?? []).reduce(applyTodoCommand, items);
  if (command.action === "todo-clear-completed") return items.filter((item) => !item.completed);
  if (command.action === "todo-complete-next") {
    const next = items.find((item) => !item.completed); return next ? items.map((item) => item.id === next.id ? { ...item, completed: true } : item) : items;
  }
  if (command.action === "todo-add-subtask" || command.action === "todo-set-description") {
    const target = command.taskTitle?.trim().toLowerCase(); if (!target) return items;
    const exact = items.find((item) => item.title.toLowerCase() === target); const match = exact ?? items.find((item) => item.title.toLowerCase().includes(target)); if (!match) return items;
    if (command.action === "todo-set-description") return items.map((item) => item.id === match.id ? { ...item, description: command.description?.trim() || undefined } : item);
    const subtask = createSubtask(command.subtaskTitle ?? "", command.subtaskDescription); return subtask ? items.map((item) => item.id === match.id ? { ...item, subtasks: [...(item.subtasks ?? []), subtask] } : item) : items;
  }
  const templates: Record<string, string> = { "todo-follow-up": "Follow up: ", "todo-review": "Review: " };
  const prefix = templates[command.action] ?? "";
  const priority: TodoPriority = command.action === "todo-add-high" ? "high" : "normal";
  const dueDate = command.action === "todo-add-today" ? today() : command.dueDate;
  if (["todo-add", "todo-add-high", "todo-add-today", "todo-add-due", "todo-follow-up", "todo-review", "todo-add-detailed", "todo-add-with-subtask", "todo-add-high-with-subtask"].includes(command.action)) {
    const firstSubtask = createSubtask(command.subtaskTitle ?? "", command.subtaskDescription);
    const item = createTodo(`${prefix}${command.title ?? ""}`, command.action === "todo-add-high-with-subtask" ? "high" : priority, dueDate, command.description, firstSubtask ? [firstSubtask] : []); return item ? [...items, item] : items;
  }
  return items;
}
