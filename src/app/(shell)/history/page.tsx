"use client";

import { useEffect, useMemo, useState } from "react";
import { Workspace } from "@/ui";
import { userStorageKey } from "@/lib/user-storage";
import { TODO_STORAGE_EVENT, TODO_STORAGE_KEY, type TodoItem } from "@/lib/todo-model";
import { LineEditor } from "@/components/LineEditor";
import { MarkdownPreview } from "@/components/MarkdownPreview";

type CalendarEvent = { id: string; title: string; date: string; time?: string; alert: boolean; detail?: string; createdAt: string };
type DayDocument = { id: string; name: string; day: string; body: string; taskId?: string; branchOf?: string; updatedAt: string };
const TIMELINE_OPEN_DOCUMENT_KEY = "work-sync:timeline-open-document";

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const short = (value: string) => value.length > 23 ? `${value.slice(0, 22)}…` : value;
const taskMarkdown = (task: TodoItem) => `## ${task.title}\n\n${task.description ?? "No description."}\n\n**Priority:** ${task.priority}${task.dueDate ? `\n\n**Due:** ${task.dueDate}` : ""}${task.subtasks?.length ? `\n\n### Subtasks\n${task.subtasks.map((subtask) => `- [${subtask.completed ? "x" : " "}] ${subtask.title}${subtask.description ? ` — ${subtask.description}` : ""}`).join("\n")}` : ""}`;
const eventMarkdown = (event: CalendarEvent) => `## ${event.title}\n\n**Date:** ${event.date}${event.time ? `\n\n**Time:** ${event.time}` : ""}${event.detail ? `\n\n${event.detail}` : ""}${event.alert ? "\n\n**Alert:** Enabled" : ""}`;
const withoutLegacyDayHeading = (body: string, day: string) => body.replace(new RegExp(`^#\\s+${day.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*(?:\\n+|$)`), "");

function CalendarIcon() {
  return <svg className="ms-ui-icon" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 17h2" /></svg>;
}

export default function HistoryPage() {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoSourceId, setTodoSourceId] = useState("");
  const [organizerTaskIds, setOrganizerTaskIds] = useState<string[]>([]);
  const [organizerInitialized, setOrganizerInitialized] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(isoDay(new Date()));
  const [eventTime, setEventTime] = useState("");
  const [eventAlert, setEventAlert] = useState(true);
  const [agentRequest, setAgentRequest] = useState("");
  const [dayDocuments, setDayDocuments] = useState<DayDocument[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [dayDraft, setDayDraft] = useState("");
  const [dayTaskId, setDayTaskId] = useState<string | null>(null);
  const [dayEventId, setDayEventId] = useState<string | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [calendarKey, setCalendarKey] = useState("");
  const [docsKey, setDocsKey] = useState("");
  const [todoKey, setTodoKey] = useState("");
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    setCalendarKey(userStorageKey("work-sync:timeline-events"));
    setDocsKey(userStorageKey("work-sync:timeline-day-docs"));
    setTodoKey(userStorageKey(TODO_STORAGE_KEY));
  }, []);
  useEffect(() => {
    if (!calendarKey || !docsKey || !todoKey) return;
    try {
      setCalendarEvents(JSON.parse(localStorage.getItem(calendarKey) ?? "[]"));
      const savedDocs = JSON.parse(localStorage.getItem(docsKey) ?? "[]") as DayDocument[] | Record<string, string>;
      setDayDocuments(Array.isArray(savedDocs) ? savedDocs : Object.entries(savedDocs).map(([day, body]) => ({ id: crypto.randomUUID(), name: `${day} day document`, day, body, updatedAt: new Date().toISOString() })));
      const savedTodos = JSON.parse(localStorage.getItem(todoKey) ?? "[]") as TodoItem[];
      const nextTodos = Array.isArray(savedTodos) ? savedTodos : [];
      setTodos(nextTodos);
      setOrganizerTaskIds(nextTodos.map((item) => item.id));
      setOrganizerInitialized(true);
    } catch { setCalendarEvents([]); setDayDocuments([]); setTodos([]); }
    setStorageLoaded(true);
  }, [calendarKey, docsKey, todoKey]);
  useEffect(() => {
    if (!todoKey) return;
    const syncTodos = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(todoKey) ?? "[]") as TodoItem[];
        const nextTodos = Array.isArray(saved) ? saved : [];
        setTodos((current) => JSON.stringify(current) === JSON.stringify(nextTodos) ? current : nextTodos);
      } catch { setTodos((current) => current.length ? [] : current); }
    };
    window.addEventListener(TODO_STORAGE_EVENT, syncTodos);
    window.addEventListener("storage", syncTodos);
    return () => { window.removeEventListener(TODO_STORAGE_EVENT, syncTodos); window.removeEventListener("storage", syncTodos); };
  }, [todoKey]);
  useEffect(() => { if (calendarKey && storageLoaded) localStorage.setItem(calendarKey, JSON.stringify(calendarEvents)); }, [calendarEvents, calendarKey, storageLoaded]);
  useEffect(() => { if (docsKey && storageLoaded) localStorage.setItem(docsKey, JSON.stringify(dayDocuments)); }, [dayDocuments, docsKey, storageLoaded]);
  useEffect(() => { if (todoKey && storageLoaded) { localStorage.setItem(todoKey, JSON.stringify(todos)); window.dispatchEvent(new Event(TODO_STORAGE_EVENT)); } }, [todos, todoKey, storageLoaded]);
  useEffect(() => {
    if (!storageLoaded || !docsKey || !dayDocuments.length) return;
    const openId = localStorage.getItem(userStorageKey(TIMELINE_OPEN_DOCUMENT_KEY)); const document = dayDocuments.find((item) => item.id === openId);
    if (!document) return;
    setSelectedDay(document.day); setActiveDocumentId(document.id); setDayTaskId(document.taskId ?? todos.find((task) => task.dueDate === document.day)?.id ?? null); setDayEventId(null); setDayDraft(withoutLegacyDayHeading(document.body, document.day)); localStorage.removeItem(userStorageKey(TIMELINE_OPEN_DOCUMENT_KEY));
  }, [dayDocuments, docsKey, storageLoaded, todos]);
  useEffect(() => { if (todoSourceId && !todos.some((todo) => todo.id === todoSourceId)) setTodoSourceId(""); }, [todoSourceId, todos]);

  const dayEvents = useMemo(() => [...calendarEvents, ...todos.filter((todo) => todo.dueDate).map((todo) => ({ id: `todo-${todo.id}`, title: todo.title, date: todo.dueDate!, detail: taskMarkdown(todo), alert: false, createdAt: "", todo }))], [calendarEvents, todos]);
  const days = useMemo(() => { const first = new Date(month.getFullYear(), month.getMonth(), 1); const start = new Date(first); start.setDate(first.getDate() - first.getDay()); return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; }); }, [month]);
  const organizerItems = organizerTaskIds.map((id) => todos.find((item) => item.id === id)).filter((item): item is TodoItem => Boolean(item));
  const activeDocument = dayDocuments.find((document) => document.id === activeDocumentId) ?? null;
  const dayTask = todos.find((item) => item.id === dayTaskId) ?? null;
  const dayEvent = calendarEvents.find((event) => event.id === dayEventId) ?? null;

  function createEvent(title = eventTitle, date = eventDate, time = eventTime, alert = eventAlert) { if (!title.trim() || !date) return; setCalendarEvents((current) => [{ id: crypto.randomUUID(), title: title.trim(), date, time: time || undefined, alert, createdAt: new Date().toISOString() }, ...current]); setEventTitle(""); setEventTime(""); }
  function askAgent() { const match = agentRequest.match(/(?:on\s+)?(\d{4}-\d{2}-\d{2})(?:\s+(?:at\s+)?(\d{1,2}:\d{2}))?/i); const date = match?.[1] ?? eventDate; const time = match?.[2] ?? ""; const title = agentRequest.replace(match?.[0] ?? "", "").replace(/^(create|add|schedule)\s+(an?\s+)?(event\s+)?/i, "").trim() || "Agent-created event"; createEvent(title, date, time, true); setAgentRequest(""); }
  function chooseTodoSource(id: string) { setTodoSourceId(id); setOrganizerTaskIds(id ? [id] : todos.map((item) => item.id)); setOrganizerInitialized(true); }
  function updateTodoDate(id: string, dueDate: string) { setTodos((current) => current.map((item) => item.id === id ? { ...item, dueDate: dueDate || undefined } : item)); setSelectedTodo((current) => current?.id === id ? { ...current, dueDate: dueDate || undefined } : current); }
  function openDay(day: string, event?: CalendarEvent) { const matchingTask = todos.find((task) => task.dueDate === day); const document = dayDocuments.find((item) => item.day === day); setSelectedDay(day); setDayTaskId(matchingTask?.id ?? null); setDayEventId(event?.id ?? null); setActiveDocumentId(document?.id ?? null); setDayDraft(withoutLegacyDayHeading(document?.body ?? "", day)); }
  function openCalendarEvent(event: CalendarEvent) { openDay(event.date, event); }
  function openDayDocument(document: DayDocument) { setSelectedDay(document.day); setActiveDocumentId(document.id); setDayTaskId(document.taskId ?? todos.find((task) => task.dueDate === document.day)?.id ?? null); setDayEventId(null); setDayDraft(withoutLegacyDayHeading(document.body, document.day)); }
  function saveDayDocument(name = activeDocument?.name ?? `${selectedDay} day document`, branchOf = activeDocument?.id) { if (!selectedDay) return; const document: DayDocument = { id: activeDocument?.id ?? crypto.randomUUID(), name, day: selectedDay, body: dayDraft, taskId: dayTaskId ?? undefined, branchOf, updatedAt: new Date().toISOString() }; setDayDocuments((current) => activeDocument ? current.map((item) => item.id === activeDocument.id ? document : item) : [document, ...current]); setActiveDocumentId(document.id); }
  function saveAsDayDocument() { const name = window.prompt("Name this branched Day Document", `${selectedDay} copy`)?.trim(); if (!name || !selectedDay) return; const document: DayDocument = { id: crypto.randomUUID(), name, day: selectedDay, body: dayDraft, taskId: dayTaskId ?? undefined, branchOf: activeDocument?.id, updatedAt: new Date().toISOString() }; setDayDocuments((current) => [document, ...current]); setActiveDocumentId(document.id); }

  if (selectedDay) return <Workspace title={`Calendar · ${selectedDay}`} subtitle="Day-linked document workspace" actions={<div className="ms-day-document-actions"><div className="ms-day-document-actions-left"><button className="ms-btn" type="button" onClick={() => { setSelectedDay(null); setDayEventId(null); }}>Back to Timeline</button><label className="ms-document-select">Day Documents<select aria-label="Select saved Day Document" value={activeDocumentId ?? ""} onChange={(event) => { const document = dayDocuments.find((item) => item.id === event.target.value); if (document) openDayDocument(document); }}><option value="">Current calendar day</option>{dayDocuments.map((document) => <option key={document.id} value={document.id}>{document.name} · {document.day}</option>)}</select></label></div><div className="ms-row"><button className="ms-btn" type="button" onClick={() => saveDayDocument()}>Save</button><button className="ms-btn ms-btn-primary" type="button" onClick={saveAsDayDocument}>Save As</button></div></div>}><section className="ms-panel ms-day-document-full"><header><div><h2 className="ms-panel-title">{activeDocument?.name ?? "Day document"}</h2><p className="ms-muted">Editable day document{activeDocument?.branchOf ? " · branched copy" : ""}</p></div></header><aside className="ms-day-document-meta" aria-label="Day Document metadata"><span>Date</span><time dateTime={selectedDay}>{selectedDay}</time><time dateTime={activeDocument?.updatedAt}>{activeDocument ? new Date(activeDocument.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Not saved yet"}</time></aside>{dayEvent ? <aside className="ms-day-event-context"><h3>Scheduled event</h3><MarkdownPreview value={eventMarkdown(dayEvent)} /></aside> : null}{dayTask ? <aside className="ms-day-task-context"><h3>Associated To Do</h3><MarkdownPreview value={taskMarkdown(dayTask)} /></aside> : null}<LineEditor value={dayDraft} onChange={setDayDraft} storageKey={`timeline-day-${activeDocument?.id ?? selectedDay}`} /></section></Workspace>;
  return <Workspace title="Timeline" subtitle="Calendar, To Do items, and day documents">
    <div className="ms-field ms-timeline-source"><label className="ms-label" htmlFor="timeline-source">Source</label><select id="timeline-source" className="ms-select" value={todoSourceId} onChange={(event) => chooseTodoSource(event.target.value)}><option value="">All To Do items</option>{todos.map((todo) => <option key={todo.id} value={todo.id}>{todo.title}</option>)}</select></div>
    <div className="ms-timeline-flow">
      <section className="ms-panel ms-calendar"><header className="ms-calendar-header"><div><h2 className="ms-panel-title">Calendar</h2><p>Events, alerts, and dated To Do items.</p></div><div><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><strong>{month.toLocaleString(undefined, { month: "long", year: "numeric" })}</strong><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div></header><div className="ms-calendar-create"><input aria-label="Event title" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Create calendar event…" /><input aria-label="Event date" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /><input aria-label="Event time" type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} /><label><input type="checkbox" checked={eventAlert} onChange={(event) => setEventAlert(event.target.checked)} /> Alert</label><button type="button" className="ms-btn ms-btn-primary" onClick={() => createEvent()}>Add event</button></div><div className="ms-calendar-agent"><input aria-label="Ask agent to create event" value={agentRequest} onChange={(event) => setAgentRequest(event.target.value)} placeholder="Ask Agent: schedule review on 2026-09-03 at 10:00" /><button type="button" onClick={askAgent}>Ask Agent</button></div><div className="ms-calendar-grid" role="grid" aria-label="Timeline calendar">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}{days.map((day) => { const key = isoDay(day), entries = dayEvents.filter((event) => event.date === key), hasDayDocument = dayDocuments.some((document) => document.day === key); return <button type="button" role="gridcell" className={`${day.getMonth() === month.getMonth() ? "" : "is-other"}${hasDayDocument ? " has-day-document" : ""}`} key={key} onClick={() => openDay(key)}><b>{day.getDate()}</b>{hasDayDocument ? <span className="ms-calendar-document-dot" aria-label="Saved Day Document" /> : null}{entries.slice(0, 3).map((entry: CalendarEvent & { todo?: TodoItem }) => <small key={entry.id} className={entry.todo ? "is-todo" : ""} onClick={(event) => { event.stopPropagation(); if (entry.todo) setSelectedTodo(entry.todo); else openCalendarEvent(entry); }}>{entry.alert ? "◷ " : ""}{short(entry.title)}</small>)}</button>; })}</div>{selectedTodo ? <aside className="ms-todo-side-panel"><button type="button" aria-label="Close To Do detail" onClick={() => setSelectedTodo(null)}>×</button><MarkdownPreview value={taskMarkdown(selectedTodo)} /></aside> : null}</section>
      <section className="ms-panel ms-timeline-section" aria-labelledby="timeline-section-title"><header className="ms-timeline-section-header"><div><h2 className="ms-panel-title" id="timeline-section-title">Timeline</h2><p className="ms-muted">To Do items and day-document history.</p></div></header><div className="ms-timeline-section-content"><section className="ms-todo-organizer" aria-labelledby="todo-items-title"><header><div><h3 className="ms-panel-title" id="todo-items-title">To Do items</h3><p className="ms-muted">{todoSourceId ? "The selected To Do item." : "All current To Do items."}</p></div><button type="button" className="ms-btn" onClick={() => { setOrganizerTaskIds([]); setOrganizerInitialized(true); }}>Clear</button></header><div className="ms-organizer-list" aria-label="Scrollable To Do items" tabIndex={0}>{organizerItems.map((item) => <article key={item.id}><button type="button" onClick={() => setSelectedTodo(item)}><strong>{item.title}</strong><small>{item.description || "No details"}</small></button><label className="ms-organizer-date"><CalendarIcon /><input aria-label={`Calendar date for ${item.title}`} type="date" value={item.dueDate ?? ""} onChange={(event) => updateTodoDate(item.id, event.target.value)} /></label></article>)}{organizerInitialized && !organizerItems.length ? <p className="ms-muted">No To Do items are shown. Choose a To Do source to add it here.</p> : null}</div></section><section className="ms-day-documents" aria-labelledby="day-documents-title"><header><div><h3 className="ms-panel-title" id="day-documents-title">Day Documents</h3><p className="ms-muted">Timeline history and saved day documents.</p></div></header><div className="ms-day-document-history" aria-label="Scrollable Day Documents" tabIndex={0}>{dayDocuments.map((document) => <button type="button" key={document.id} onClick={() => openDayDocument(document)}><strong>{document.name}</strong><small>{document.day} · {new Date(document.updatedAt).toLocaleString()}</small></button>)}{!dayDocuments.length ? <p className="ms-muted">Create a calendar day document to save it in Timeline history.</p> : null}</div></section></div></section>
    </div>
  </Workspace>;
}
