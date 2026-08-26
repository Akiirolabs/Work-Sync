import { getDb } from "./client";

export function nowIso(): string {
  return new Date().toISOString();
}

export function appendEvent(
  sourceId: string,
  type: string,
  message: string,
  payload?: Record<string, unknown>,
) {
  const event = {
    id: crypto.randomUUID(),
    sourceId,
    type,
    message,
    payload: payload ?? {},
    createdAt: nowIso(),
  };
  const db = getDb();
  db.prepare(
    `INSERT INTO history_events (id, source_id, type, message, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    event.id,
    event.sourceId,
    event.type,
    event.message,
    JSON.stringify(event.payload),
    event.createdAt,
  );
  return event;
}

export function touchSource(sourceId: string, status?: string) {
  const db = getDb();
  if (status) {
    db.prepare(`UPDATE sources SET updated_at = ?, status = ? WHERE id = ?`).run(
      nowIso(),
      status,
      sourceId,
    );
  } else {
    db.prepare(`UPDATE sources SET updated_at = ? WHERE id = ?`).run(nowIso(), sourceId);
  }
}
