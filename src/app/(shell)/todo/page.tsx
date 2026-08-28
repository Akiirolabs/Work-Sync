"use client";

import { useEffect, useMemo, useState } from "react";
import { Workspace } from "@/ui";
import { AO_TODO_COMMAND_EVENT, AO_TODO_COMMAND_KEY, TODO_STORAGE_KEY, applyTodoCommand, createTodo, type AOTodoCommand, type TodoItem } from "@/lib/todo-model";

type Filter = "all" | "open" | "done";

export default function TodoPage() {
  const [items, setItems] = useState<TodoItem[]>([]); const [title, setTitle] = useState(""); const [filter, setFilter] = useState<Filter>("all"); const [ready, setReady] = useState(false);
  useEffect(() => { try { const parsed = JSON.parse(localStorage.getItem(TODO_STORAGE_KEY) ?? "[]") as TodoItem[]; setItems(Array.isArray(parsed) ? parsed : []); } catch { setItems([]); } setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(items)); }, [items, ready]);
  useEffect(() => {
    if (!ready) return;
    function consume() { const raw = localStorage.getItem(AO_TODO_COMMAND_KEY); if (!raw) return; localStorage.removeItem(AO_TODO_COMMAND_KEY); try { setItems((current) => applyTodoCommand(current, JSON.parse(raw) as AOTodoCommand)); } catch { /* ignore malformed command */ } }
    consume(); window.addEventListener(AO_TODO_COMMAND_EVENT, consume); return () => window.removeEventListener(AO_TODO_COMMAND_EVENT, consume);
  }, [ready]);
  const visible = useMemo(() => items.filter((item) => filter === "all" || (filter === "done" ? item.completed : !item.completed)), [filter, items]);
  function add() { const item = createTodo(title); if (!item) return; setItems((current) => [...current, item]); setTitle(""); }
  return <Workspace title="To Do" subtitle={`${items.filter((item) => !item.completed).length} open · ${items.filter((item) => item.completed).length} complete`} actions={<button type="button" className="ms-btn" onClick={() => setItems((current) => current.filter((item) => !item.completed))}>Clear completed</button>}>
    <section className="ms-panel ms-todo-panel">
      <div className="ms-todo-add"><input aria-label="New task" value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") add(); }} placeholder="Add a task…" /><button type="button" className="ms-btn ms-btn-primary" onClick={add}>Add</button></div>
      <div className="ms-todo-filters" aria-label="Task filters">{(["all", "open", "done"] as Filter[]).map((option) => <button type="button" className={filter === option ? "is-active" : ""} onClick={() => setFilter(option)} key={option}>{option}</button>)}</div>
      <div className="ms-todo-list">{visible.map((item) => <article className={`ms-todo-item${item.completed ? " is-done" : ""}`} key={item.id}><input type="checkbox" checked={item.completed} aria-label={`Complete ${item.title}`} onChange={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry))} /><span><strong>{item.title}</strong><small>{item.priority === "high" ? "High priority" : "Task"}{item.dueDate ? ` · Due ${item.dueDate}` : ""}</small></span><button type="button" aria-label={`Delete ${item.title}`} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>×</button></article>)}{!visible.length && <p className="ms-muted ms-todo-empty">No tasks in this view.</p>}</div>
    </section>
  </Workspace>;
}
