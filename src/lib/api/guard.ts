import { NextResponse } from "next/server";
import {
  checkRateLimit,
  hasApiAccess,
  requestUserId,
} from "@/lib/security/auth";
import { getDb } from "@/lib/db/client";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function requireApiKey(req: Request): NextResponse | null {
  return hasApiAccess(req) ? null : jsonError("Unauthorized", 401);
}

export function requireSourceOwner(req: Request, sourceId: string): NextResponse | null {
  const source = getDb()
    .prepare("SELECT id FROM sources WHERE id = ? AND user_id IS ?")
    .get(sourceId, requestUserId(req));
  return source ? null : jsonError("Source not found", 404);
}

export function requireVerifyRateLimit(req: Request): NextResponse | null {
  const key = req.headers.get("x-api-key") ?? req.headers.get("x-forwarded-for") ?? "local";
  const result = checkRateLimit(`verify:${key}`);
  if (!result.ok) {
    return jsonError("Rate limit exceeded", 429);
  }
  return null;
}
