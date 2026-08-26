import { createHash, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db/client";
import type { ApiKeyRow, RateLimitRow } from "@/lib/db/schema";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
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
