import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const testDirectory = await mkdtemp(join(tmpdir(), "work-sync-auth-"));
process.env.KNOWLEDGE_DB_PATH = join(testDirectory, "auth.db");
process.env.KNOWLEDGE_API_KEY = "integration-api-key";

const { getDb } = await import("../src/lib/db/client.ts");
const { hasApiAccess } = await import("../src/lib/security/auth.ts");

const db = getDb();
const now = new Date().toISOString();
db.prepare(
  `INSERT INTO users (id, name, email, password_hash, created_at)
   VALUES (?, ?, ?, ?, ?)`,
).run("auth-user", "Auth User", "auth@example.com", "test-hash", now);
db.prepare(
  `INSERT INTO user_sessions (id, user_id, expires_at, created_at)
   VALUES (?, ?, ?, ?)`,
).run(
  "valid-session",
  "auth-user",
  new Date(Date.now() + 60_000).toISOString(),
  now,
);
db.prepare(
  `INSERT INTO user_sessions (id, user_id, expires_at, created_at)
   VALUES (?, ?, ?, ?)`,
).run(
  "expired-session",
  "auth-user",
  new Date(Date.now() - 60_000).toISOString(),
  now,
);

function productionRequest(headers = {}) {
  return new Request("https://work.akiiro.com/api/v1/notes", {
    headers: { host: "work.akiiro.com", ...headers },
  });
}

test("production API accepts a valid logged-in user session", () => {
  const allowed = hasApiAccess(
    productionRequest({ cookie: "theme=dark; work_sync_session=valid-session" }),
  );
  assert.equal(allowed, true);
});

test("production API rejects invalid and expired user sessions", () => {
  const invalid = hasApiAccess(
    productionRequest({ cookie: "work_sync_session=invalid-session" }),
  );
  const expired = hasApiAccess(
    productionRequest({ cookie: "work_sync_session=expired-session" }),
  );

  assert.equal(invalid, false);
  assert.equal(expired, false);
});

test("production API still accepts external API keys", () => {
  const allowed = hasApiAccess(
    productionRequest({ "x-api-key": "integration-api-key" }),
  );
  assert.equal(allowed, true);
});

test("production API rejects requests without either credential", () => {
  assert.equal(hasApiAccess(productionRequest()), false);
});

test("localhost development access remains available", () => {
  const allowed = hasApiAccess(
    new Request("http://localhost:3002/api/v1/notes", {
      headers: { host: "localhost:3002" },
    }),
  );
  assert.equal(allowed, true);
});

test.after(async () => {
  db.close();
  await rm(testDirectory, { recursive: true, force: true });
});
