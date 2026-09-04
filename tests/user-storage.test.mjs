import assert from "node:assert/strict";
import test from "node:test";

class MemoryStorage {
  #values = new Map();
  get length() { return this.#values.size; }
  key(index) { return [...this.#values.keys()][index] ?? null; }
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
  clear() { this.#values.clear(); }
}

globalThis.localStorage = new MemoryStorage();
const { ACTIVE_STORAGE_USER_KEY, collectUserStorage, setActiveStorageUser, userStorageKey } = await import("../src/lib/user-storage.ts");

test.beforeEach(() => localStorage.clear());

test("legacy editor metadata is restored into the current signed-out scope", () => {
  localStorage.setItem("work-sync:line-meta:note-1", '[{"kind":"h1"}]');
  const scoped = userStorageKey("work-sync:line-meta:note-1");
  assert.equal(scoped, "work-sync:line-meta:note-1:user:signed-out");
  assert.equal(localStorage.getItem(scoped), '[{"kind":"h1"}]');
  assert.equal(localStorage.getItem("work-sync:line-meta:note-1"), null);
});

test("a login transfers signed-out data once without exposing another user", () => {
  localStorage.setItem("work-sync:workspace-draft:user:signed-out", "first draft");
  assert.equal(setActiveStorageUser("user-1"), true);
  assert.equal(localStorage.getItem("work-sync:workspace-draft:user:user-1"), "first draft");
  assert.equal(localStorage.getItem("work-sync:workspace-draft:user:signed-out"), null);

  setActiveStorageUser(null);
  setActiveStorageUser("user-2");
  assert.equal(localStorage.getItem("work-sync:workspace-draft:user:user-2"), null);
  assert.equal(localStorage.getItem(ACTIVE_STORAGE_USER_KEY), "user-2");
});

test("account sync collects durable user data and excludes one-shot commands", () => {
  localStorage.setItem("work-sync:tables:user:user-1", '[{"name":"Shared"}]');
  localStorage.setItem("work-sync:todos:user:user-1", '[{"title":"Follow up"}]');
  localStorage.setItem("work-sync:todo-lists:user:user-1", '[{"id":"launch","title":"Launch"}]');
  localStorage.setItem("work-sync:ao-table-command:user:user-1", '{"action":"add-row"}');
  localStorage.setItem("work-sync:tables:user:user-2", '[{"name":"Private"}]');

  assert.deepEqual(collectUserStorage("user-1"), {
    "work-sync:tables": '[{"name":"Shared"}]',
    "work-sync:todos": '[{"title":"Follow up"}]',
    "work-sync:todo-lists": '[{"id":"launch","title":"Launch"}]',
  });
});
