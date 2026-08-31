import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

let singleton: DatabaseSync | null = null;

function resolveDbPath(): string {
  const configured = process.env.KNOWLEDGE_DB_PATH ?? "./data/knowledge.db";
  const absolute = path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  return absolute;
}

function migrate(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      topic_tag TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS claims (
      source_id TEXT PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
      series_json TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'upload',
      ingested_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verifications (
      source_id TEXT PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
      result_json TEXT NOT NULL,
      analyzed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS history_events (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fix_documents (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      finding_id TEXT NOT NULL,
      fix_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body_markdown TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      window_start INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_state (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_history_source ON history_events(source_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_fixes_source ON fix_documents(source_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
  `);

  const sourceColumns = db.prepare("PRAGMA table_info(sources)").all() as Array<{ name: string }>;
  const addedSourceOwner = !sourceColumns.some((column) => column.name === "user_id");
  if (addedSourceOwner) {
    db.exec("ALTER TABLE sources ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE");
    const firstUser = db.prepare("SELECT id FROM users ORDER BY created_at ASC LIMIT 1").get() as { id: string } | undefined;
    if (firstUser) db.prepare("UPDATE sources SET user_id = ? WHERE user_id IS NULL").run(firstUser.id);
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_sources_user_updated ON sources(user_id, updated_at)");

  const noteColumns = db.prepare("PRAGMA table_info(workspace_notes)").all() as Array<{ name: string }>;
  const addedNoteOwner = !noteColumns.some((column) => column.name === "user_id");
  if (addedNoteOwner) {
    db.exec("ALTER TABLE workspace_notes ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE");
    const firstUser = db.prepare("SELECT id FROM users ORDER BY created_at ASC LIMIT 1").get() as { id: string } | undefined;
    if (firstUser) db.prepare("UPDATE workspace_notes SET user_id = ? WHERE user_id IS NULL").run(firstUser.id);
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_workspace_notes_user_updated ON workspace_notes(user_id, updated_at)");
}

export function getDb(): DatabaseSync {
  if (singleton) return singleton;
  const db = new DatabaseSync(resolveDbPath());
  migrate(db);
  singleton = db;
  return db;
}
