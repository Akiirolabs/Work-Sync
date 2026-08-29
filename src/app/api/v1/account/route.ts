import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { nowIso } from "@/lib/db/helpers";
import { AccountCredentials } from "@/lib/security/account-credentials";

const COOKIE = "work_sync_session";

type UserRow = { id: string; name: string; email: string; password_hash: string };

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function passwordMatches(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function sessionUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return getDb().prepare(
    `SELECT users.id, users.name, users.email
     FROM user_sessions JOIN users ON users.id = user_sessions.user_id
     WHERE user_sessions.id = ? AND user_sessions.expires_at > ?`,
  ).get(token, nowIso()) as Pick<UserRow, "id" | "name" | "email"> | undefined;
}

export async function GET() {
  const user = await sessionUser();
  return NextResponse.json({ user: user ?? null });
}

export async function POST(req: Request) {
  const parsed = AccountCredentials.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 400 });
  }
  const { mode, email, password } = parsed.data;
  const db = getDb();
  let user = db.prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?").get(email) as UserRow | undefined;

  if (mode === "create") {
    if (user) return NextResponse.json({ error: "An account already exists for that email" }, { status: 409 });
    user = { id: crypto.randomUUID(), name: parsed.data.name, email, password_hash: hashPassword(password) };
    db.prepare("INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(user.id, user.name, user.email, user.password_hash, nowIso());
  } else if (!user || !passwordMatches(password, user.password_hash)) {
    return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  db.prepare("INSERT INTO user_sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(token, user.id, expires.toISOString(), nowIso());
  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", expires, secure: process.env.NODE_ENV === "production" });
  return res;
}

export async function DELETE() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM user_sessions WHERE id = ?").run(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
