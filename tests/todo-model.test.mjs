import assert from "node:assert/strict";
import test from "node:test";
import { applyTodoCommand, createTodo, moveSubtask, moveTodo } from "../src/lib/todo-model.ts";

test("creates, prioritizes and dates To Do tasks", () => {
  assert.equal(createTodo("   "), null);
  const high = applyTodoCommand([], { action: "todo-add-high", title: "Ship release" });
  assert.equal(high.length, 1); assert.equal(high[0].title, "Ship release"); assert.equal(high[0].priority, "high");
  const dated = applyTodoCommand(high, { action: "todo-add-due", title: "Review metrics", dueDate: "2026-09-01" });
  assert.equal(dated[1].dueDate, "2026-09-01");
});

test("runs useful task batches and clears completed work", () => {
  const added = applyTodoCommand([], { action: "todo-batch", commands: [
    { action: "todo-follow-up", title: "Jordan" },
    { action: "todo-review", title: "Launch brief" },
    { action: "todo-complete-next" },
  ] });
  assert.deepEqual(added.map((item) => item.title), ["Follow up: Jordan", "Review: Launch brief"]);
  assert.equal(added[0].completed, true); assert.equal(added[1].completed, false);
  assert.deepEqual(applyTodoCommand(added, { action: "todo-clear-completed" }).map((item) => item.title), ["Review: Launch brief"]);
});

test("stores task and subtask descriptions and targets existing tasks", () => {
  let items = applyTodoCommand([], { action: "todo-add-with-subtask", title: "Launch", description: "Ship the release", subtaskTitle: "QA", subtaskDescription: "Run the regression suite" });
  assert.equal(items[0].description, "Ship the release");
  assert.deepEqual(items[0].subtasks.map(({ title, description }) => ({ title, description })), [{ title: "QA", description: "Run the regression suite" }]);
  items = applyTodoCommand(items, { action: "todo-add-subtask", taskTitle: "laun", subtaskTitle: "Announce", subtaskDescription: "Notify the team" });
  assert.equal(items[0].subtasks.length, 2); assert.equal(items[0].subtasks[1].description, "Notify the team");
  items = applyTodoCommand(items, { action: "todo-set-description", taskTitle: "Launch", description: "Updated launch plan" });
  assert.equal(items[0].description, "Updated launch plan");
});

test("reorders tasks and subtasks without losing their content", () => {
  let items = applyTodoCommand([], { action: "todo-add-with-subtask", title: "First", subtaskTitle: "A" });
  items = applyTodoCommand(items, { action: "todo-add-subtask", taskTitle: "First", subtaskTitle: "B" });
  items = applyTodoCommand(items, { action: "todo-add", title: "Second" });
  const movedTasks = moveTodo(items, items[1].id, items[0].id);
  assert.deepEqual(movedTasks.map((item) => item.title), ["Second", "First"]);
  const first = movedTasks[1]; const movedSubtasks = moveSubtask(movedTasks, first.id, first.subtasks[1].id, first.subtasks[0].id);
  assert.deepEqual(movedSubtasks[1].subtasks.map((item) => item.title), ["B", "A"]);
});
