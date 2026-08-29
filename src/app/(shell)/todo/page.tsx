"use client";

import { useEffect, useMemo, useState } from "react";
import { Workspace } from "@/ui";
import { AO_TODO_COMMAND_EVENT, AO_TODO_COMMAND_KEY, TODO_STORAGE_KEY, applyTodoCommand, createSubtask, createTodo, type AOTodoCommand, type TodoItem } from "@/lib/todo-model";
import { userStorageKey } from "@/lib/user-storage";

type Filter = "all" | "open" | "done";

export default function TodoPage() {
  const [items, setItems] = useState<TodoItem[]>([]); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [filter, setFilter] = useState<Filter>("all"); const [ready, setReady] = useState(false);
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, { title: string; description: string }>>({});
  const [taskMenu, setTaskMenu] = useState<string | null>(null);
  const [taskEdit, setTaskEdit] = useState({ title: "", dueDate: "" });
  useEffect(() => { try { const parsed = JSON.parse(localStorage.getItem(userStorageKey(TODO_STORAGE_KEY)) ?? "[]") as TodoItem[]; setItems(Array.isArray(parsed) ? parsed : []); } catch { setItems([]); } setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(userStorageKey(TODO_STORAGE_KEY), JSON.stringify(items)); }, [items, ready]);
  useEffect(() => {
    if (!ready) return;
    function consume() { const raw = localStorage.getItem(userStorageKey(AO_TODO_COMMAND_KEY)); if (!raw) return; localStorage.removeItem(userStorageKey(AO_TODO_COMMAND_KEY)); try { setItems((current) => applyTodoCommand(current, JSON.parse(raw) as AOTodoCommand)); } catch { /* ignore malformed command */ } }
    consume(); window.addEventListener(AO_TODO_COMMAND_EVENT, consume); return () => window.removeEventListener(AO_TODO_COMMAND_EVENT, consume);
  }, [ready]);
  useEffect(() => {
    function dismiss(event: PointerEvent) { if (!(event.target instanceof Element && (event.target.closest("[data-todo-menu]") || event.target.closest("[data-todo-menu-toggle]")))) setTaskMenu(null); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") setTaskMenu(null); }
    document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, []);
  const visible = useMemo(() => items.filter((item) => filter === "all" || (filter === "done" ? item.completed : !item.completed)), [filter, items]);
  function add() { const item = createTodo(title, "normal", undefined, description); if (!item) return; setItems((current) => [...current, item]); setTitle(""); setDescription(""); }
  function updateDraft(itemId: string, patch: Partial<{ title: string; description: string }>) { setSubtaskDrafts((current) => ({ ...current, [itemId]: { title: current[itemId]?.title ?? "", description: current[itemId]?.description ?? "", ...patch } })); }
  function addSubtask(itemId: string) { const draft = subtaskDrafts[itemId] ?? { title: "", description: "" }; const subtask = createSubtask(draft.title, draft.description); if (!subtask) return; setItems((current) => current.map((item) => item.id === itemId ? { ...item, subtasks: [...(item.subtasks ?? []), subtask] } : item)); setSubtaskDrafts((current) => ({ ...current, [itemId]: { title: "", description: "" } })); }
  function openTaskMenu(item: TodoItem) { setTaskEdit({ title: item.title, dueDate: item.dueDate ?? "" }); setTaskMenu((current) => current === item.id ? null : item.id); }
  function saveTaskEdit(itemId: string) { const cleanTitle = taskEdit.title.trim(); if (!cleanTitle) return; setItems((current) => current.map((item) => item.id === itemId ? { ...item, title: cleanTitle, dueDate: taskEdit.dueDate || undefined } : item)); setTaskMenu(null); }
  return <Workspace title="To Do" subtitle={`${items.filter((item) => !item.completed).length} open · ${items.filter((item) => item.completed).length} complete`} actions={<button type="button" className="ms-btn" onClick={() => setItems((current) => current.filter((item) => !item.completed))}>Clear completed</button>}>
    <section className="ms-panel ms-todo-panel">
      <div className="ms-todo-add"><input aria-label="New task" value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") add(); }} placeholder="Add a task…" /><input aria-label="New task description" value={description} onChange={(event) => setDescription(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") add(); }} placeholder="Description (optional)" /><button type="button" className="ms-btn ms-btn-primary" onClick={add}>Add</button></div>
      <div className="ms-todo-filters" aria-label="Task filters">{(["all", "open", "done"] as Filter[]).map((option) => <button type="button" className={filter === option ? "is-active" : ""} onClick={() => setFilter(option)} key={option}>{option}</button>)}</div>
      <div className="ms-todo-list">{visible.map((item) => <article className={`ms-todo-item${item.completed ? " is-done" : ""}`} key={item.id}>
        <input type="checkbox" checked={item.completed} aria-label={`Complete ${item.title}`} onChange={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry))} />
        <span><strong>{item.title}</strong><small>{item.priority === "high" ? "High priority" : "Task"}{item.dueDate ? ` · Due ${item.dueDate}` : ""}{item.subtasks?.length ? ` · ${item.subtasks.filter((subtask) => subtask.completed).length}/${item.subtasks.length} subtasks` : ""}</small></span>
        <div className="ms-todo-actions"><button type="button" data-todo-menu-toggle aria-label={`Edit ${item.title}`} aria-expanded={taskMenu === item.id} onClick={() => openTaskMenu(item)}>•••</button><button type="button" className="ms-todo-delete" aria-label={`Delete ${item.title}`} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>×</button></div>
        {taskMenu === item.id && <form className="ms-todo-menu" data-todo-menu onSubmit={(event) => { event.preventDefault(); saveTaskEdit(item.id); }}><label>Task title<input aria-label={`Edit title for ${item.title}`} autoFocus value={taskEdit.title} onChange={(event) => setTaskEdit((current) => ({ ...current, title: event.target.value }))} /></label><label>Due date<input type="date" aria-label={`Due date for ${item.title}`} value={taskEdit.dueDate} onChange={(event) => setTaskEdit((current) => ({ ...current, dueDate: event.target.value }))} /></label><div><button type="button" onClick={() => setTaskEdit((current) => ({ ...current, dueDate: "" }))}>Clear date</button><button type="submit" disabled={!taskEdit.title.trim()}>Save</button></div></form>}
        <div className="ms-todo-detail">
          <textarea aria-label={`Description for ${item.title}`} value={item.description ?? ""} onChange={(event) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value } : entry))} placeholder="Add a task description…" />
          {(item.subtasks ?? []).map((subtask) => <div className={`ms-subtask${subtask.completed ? " is-done" : ""}`} key={subtask.id}><input type="checkbox" checked={subtask.completed} aria-label={`Complete subtask ${subtask.title}`} onChange={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, subtasks: (entry.subtasks ?? []).map((candidate) => candidate.id === subtask.id ? { ...candidate, completed: !candidate.completed } : candidate) } : entry))} /><span><strong>{subtask.title}</strong>{subtask.description && <small>{subtask.description}</small>}</span><button type="button" aria-label={`Delete subtask ${subtask.title}`} onClick={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, subtasks: (entry.subtasks ?? []).filter((candidate) => candidate.id !== subtask.id) } : entry))}>×</button></div>)}
          <div className="ms-subtask-add"><input aria-label={`New subtask for ${item.title}`} value={subtaskDrafts[item.id]?.title ?? ""} onChange={(event) => updateDraft(item.id, { title: event.target.value })} placeholder="Add a subtask…" /><input aria-label={`Subtask description for ${item.title}`} value={subtaskDrafts[item.id]?.description ?? ""} onChange={(event) => updateDraft(item.id, { description: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") addSubtask(item.id); }} placeholder="Description (optional)" /><button type="button" onClick={() => addSubtask(item.id)}>Add subtask</button></div>
        </div>
      </article>)}{!visible.length && <p className="ms-muted ms-todo-empty">No tasks in this view.</p>}</div>
    </section>
  </Workspace>;
}
