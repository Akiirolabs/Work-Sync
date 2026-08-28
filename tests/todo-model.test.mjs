import assert from "node:assert/strict";
import test from "node:test";
import { applyTodoCommand, createTodo } from "../src/lib/todo-model.ts";

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
