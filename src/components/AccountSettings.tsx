"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LiquidChromeOrb } from "@/ui";
import { hydrateUserStorage, setActiveStorageUser, startUserStorageSync } from "@/lib/user-storage";

type User = { id: string; name: string; email: string };
type Theme = "dark" | "light";
const THEME_KEY = "work-sync:theme";

export function AccountSettings() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let stopSync: (() => void) | undefined;
    void fetch("/api/v1/account").then((r) => r.json()).then(async (d) => {
      const nextUser = (d.user ?? null) as User | null;
      const storageUserChanged = setActiveStorageUser(nextUser?.id ?? null);
      if (nextUser) await hydrateUserStorage(nextUser.id, storageUserChanged);
      setUser(nextUser);
      // Hydration runs after child effects in this shell. Reloading here can
      // create a fetch/reload loop when an initially mounted child writes its
      // empty state before the remote state finishes hydrating.
      if (nextUser) stopSync = startUserStorageSync(nextUser.id);
    });
    return () => stopSync?.();
  }, []);
  useEffect(() => {
    const refreshProfileObjects = () => window.location.reload();
    window.addEventListener("work-sync:server-objects-updated", refreshProfileObjects);
    return () => window.removeEventListener("work-sync:server-objects-updated", refreshProfileObjects);
  }, []);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    setTheme(saved === "light" ? "light" : "dark");
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const credentials = {
      mode,
      email: data.get("email"),
      password: data.get("password"),
      ...(mode === "create" ? { name: data.get("name") } : {}),
    };
    const res = await fetch("/api/v1/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(credentials) });
    const payload = await res.json(); setBusy(false);
    if (!res.ok) return setError(payload.error ?? "Unable to continue");
    const storageUserChanged = setActiveStorageUser(payload.user.id);
    await hydrateUserStorage(payload.user.id, storageUserChanged);
    window.location.reload();
  }

  async function signOut() {
    await fetch("/api/v1/account", { method: "DELETE" });
    setActiveStorageUser(null);
    window.location.reload();
  }

  return <>
    <button className="ms-account-trigger" type="button" onClick={() => setOpen(true)} aria-label="Open settings">
      <LiquidChromeOrb size={17} title="Open settings" />
      <span>{user?.name ?? "Settings"}</span>
      <span aria-hidden>⌄</span>
    </button>
    <dialog ref={dialog} className="ms-dialog" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }} onClose={() => setOpen(false)}>
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
      <section className="ms-theme-settings" aria-label="Appearance settings"><div><strong>Appearance</strong><p>{theme === "dark" ? "Dark Mode keeps the current Work Sync visual mode." : "Light Mode uses a brighter inverse palette."}</p></div><div role="group" aria-label="Choose color theme"><button type="button" className={theme === "dark" ? "is-active" : ""} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>Dark Mode</button><button type="button" className={theme === "light" ? "is-active" : ""} aria-pressed={theme === "light"} onClick={() => setTheme("light")}>Light Mode</button></div></section>
    </dialog>
  </>;
}
