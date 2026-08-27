"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LiquidChromeOrb } from "@/ui";

type User = { id: string; name: string; email: string };

export function AccountSettings() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => { void fetch("/api/v1/account").then((r) => r.json()).then((d) => setUser(d.user)); }, []);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, name: data.get("name"), email: data.get("email"), password: data.get("password") }) });
    const payload = await res.json(); setBusy(false);
    if (!res.ok) return setError(payload.error ?? "Unable to continue");
    setUser(payload.user); setOpen(false);
  }

  async function signOut() {
    await fetch("/api/v1/account", { method: "DELETE" }); setUser(null); setOpen(false);
  }

  return <>
    <button className="ms-account-trigger" type="button" onClick={() => setOpen(true)} aria-label="Open settings">
      <LiquidChromeOrb size={17} title="Open settings" />
      <span>{user?.name ?? "Settings"}</span>
      <span aria-hidden>⌄</span>
    </button>
    <dialog ref={dialog} className="ms-dialog" onClose={() => setOpen(false)}>
      <div className="ms-dialog-head"><div><p className="ms-eyebrow">Work Sync</p><h2>Settings</h2></div><button className="ms-icon-btn" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
      {user ? <div className="ms-account-card">
        <div className="ms-account-avatar is-large">{user.name[0]?.toUpperCase()}</div>
        <div><strong>{user.name}</strong><p>{user.email}</p></div>
        <button className="ms-btn" type="button" onClick={() => void signOut()}>Log out</button>
      </div> : <>
        <div className="ms-segmented"><button className={mode === "signin" ? "is-active" : ""} onClick={() => setMode("signin")}>Log in</button><button className={mode === "create" ? "is-active" : ""} onClick={() => setMode("create")}>Create account</button></div>
        <form onSubmit={submit} className="ms-account-form">
          {mode === "create" && <label><span>Name</span><input className="ms-input" name="name" autoComplete="name" required /></label>}
          <label><span>Email</span><input className="ms-input" name="email" type="email" autoComplete="email" required /></label>
          <label><span>Password</span><input className="ms-input" name="password" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required /></label>
          {error && <p className="ms-form-error">{error}</p>}
          <button className="ms-btn ms-btn-primary" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Log in" : "Create account"}</button>
        </form>
      </>}
    </dialog>
  </>;
}
