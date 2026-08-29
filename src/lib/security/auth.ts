import { createHash, timingSafeEqual } from "node:crypto";
import { getDb } from "../db/client.ts";
import type { ApiKeyRow, RateLimitRow } from "../db/schema.ts";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function requestCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const cookie = part.trim();
    const separator = cookie.indexOf("=");
    if (separator === -1 || cookie.slice(0, separator) !== name) continue;

    try {
      return decodeURIComponent(cookie.slice(separator + 1));
    } catch {
      return null;
    }
  }

  return null;
}

export function requestUserId(req: Request): string | null {
  const token = requestCookie(req, "work_sync_session");
  if (!token) return null;

  const session = getDb()
    .prepare(
      `SELECT user_id FROM user_sessions
       WHERE id = ? AND expires_at > ?
       LIMIT 1`,
    )
    .get(token, new Date().toISOString()) as { user_id: string } | undefined;

  return session?.user_id ?? null;
}

export function verifyUserSession(req: Request): boolean {
  return requestUserId(req) !== null;
}

export function verifyApiKey(headerValue: string | null): boolean {
  if (!headerValue) return false;
  const envKey = process.env.KNOWLEDGE_API_KEY ?? "";
  if (envKey && safeEqual(headerValue, envKey)) return true;

  const hash = hashApiKey(headerValue);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, label, key_hash, created_at, revoked_at FROM api_keys
       WHERE key_hash = ? AND revoked_at IS NULL LIMIT 1`,
    )
    .get(hash) as ApiKeyRow | undefined;
  return Boolean(row);
}

export function hasApiAccess(req: Request): boolean {
  if (verifyUserSession(req)) return true;

  const key = req.headers.get("x-api-key");
  if (verifyApiKey(key)) return true;

  const host = req.headers.get("host") ?? "";
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");
  if (!isLocal || key) return false;

  const referer = req.headers.get("referer") ?? "";
  return (
    !referer ||
    referer.includes("localhost") ||
    referer.includes("127.0.0.1") ||
    referer.includes("[::1]")
  );
}

export function checkRateLimit(
  key: string,
  max = Number(process.env.KNOWLEDGE_RATE_LIMIT_MAX ?? 30),
  windowMs = Number(process.env.KNOWLEDGE_RATE_LIMIT_WINDOW_MS ?? 60_000),
): { ok: boolean; remaining: number } {
  const db = getDb();
  const now = Date.now();
  const existing = db
    .prepare(`SELECT key, count, window_start FROM rate_limit_buckets WHERE key = ?`)
    .get(key) as RateLimitRow | undefined;

  if (!existing || now - existing.window_start > windowMs) {
    db.prepare(
      `INSERT INTO rate_limit_buckets (key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start`,
    ).run(key, now);
    return { ok: true, remaining: max - 1 };
  }

  if (existing.count >= max) {
    return { ok: false, remaining: 0 };
  }

  db.prepare(`UPDATE rate_limit_buckets SET count = ? WHERE key = ?`).run(
    existing.count + 1,
    key,
  );

  return { ok: true, remaining: max - existing.count - 1 };
}
