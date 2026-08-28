"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AO_MACROS_KEY,
  AO_TABLE_COMMAND_EVENT,
  AO_TABLE_COMMAND_KEY,
  AO_WORKSPACE_TEXT_EVENT,
  AO_WORKSPACE_TEXT_KEY,
  type AOMacroPreset,
  type AOTableCommand,
} from "@/lib/ao-macro";
import styles from "./AOMacroMenu.module.css";

type View = "main" | "macro" | "route" | "turbo" | "preferences";

const ROUTES = [
  ["Workspace", "/", "⌂"],
  ["Tables", "/tables", "▦"],
  ["Sources", "/sources", "S"],
  ["Verify", "/verify", "✓"],
  ["History", "/history", "H"],
  ["Connect", "/connect", "C"],
] as const;

function AOLogo() {
  return <span className={styles.logo} aria-hidden>
    <svg viewBox="0 0 32 32" focusable="false">
      <path d="M3.75 22.5 9.25 8.75l5.5 13.75M5.9 17h6.7" />
      <rect x="18" y="8.75" width="10" height="13.75" rx="5" />
    </svg>
  </span>;
}

export function AOMacroMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const [turboText, setTurboText] = useState("");
  const [presetLabel, setPresetLabel] = useState("");
  const [presetText, setPresetText] = useState("");
  const [presets, setPresets] = useState<AOMacroPreset[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(AO_MACROS_KEY) ?? "[]") as unknown;
      if (Array.isArray(parsed)) setPresets(parsed.filter((item): item is AOMacroPreset => Boolean(item && typeof item === "object" && "id" in item && "label" in item && "text" in item)));
    } catch { /* ignore invalid local preferences */ }
  }, []);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  function close() {
    setOpen(false);
    setView("main");
  }

  function sendTableCommand(command: AOTableCommand) {
    localStorage.setItem(AO_TABLE_COMMAND_KEY, JSON.stringify(command));
    if (pathname === "/tables") window.dispatchEvent(new Event(AO_TABLE_COMMAND_EVENT));
    else router.push("/tables");
    close();
  }

  function sendWorkspaceText(text: string) {
    const value = text.trim();
    if (!value) return;
    localStorage.setItem(AO_WORKSPACE_TEXT_KEY, value);
    if (pathname === "/") window.dispatchEvent(new Event(AO_WORKSPACE_TEXT_EVENT));
    else router.push("/");
    close();
  }

  function savePreset() {
    if (!presetLabel.trim() || !presetText.trim()) return;
    const next = [...presets, { id: crypto.randomUUID(), label: presetLabel.trim(), text: presetText.trim() }];
    setPresets(next);
    localStorage.setItem(AO_MACROS_KEY, JSON.stringify(next));
    setPresetLabel("");
    setPresetText("");
  }

  function removePreset(id: string) {
    const next = presets.filter((preset) => preset.id !== id);
    setPresets(next);
    localStorage.setItem(AO_MACROS_KEY, JSON.stringify(next));
  }

  const titles: Record<View, string> = { main: "Macro Key Menu", macro: "Macro", route: "Route", turbo: "Turbo", preferences: "Preferences" };

  return <div className={styles.root} ref={rootRef}>
    {open && <section className={styles.panel} role="dialog" aria-label="AO macro key menu">
      <header className={styles.header}>
        {view === "main" ? <AOLogo /> : <button type="button" className={styles.back} aria-label="Back to macro key menu" onClick={() => setView("main")}>←</button>}
        <div><strong>{titles[view]}</strong><small>AO · Akiiro Operator</small></div>
        <button type="button" className={styles.close} aria-label="Close AO macro key menu" onClick={close}>×</button>
      </header>

      {view === "main" && <div className={styles.list}>
        <button type="button" onClick={() => setView("macro")}><span className={styles.infoMark} tabIndex={0} aria-label="Macro information" data-tip="Run saved actions and reusable text presets.">i</span><b>Macro</b><em>›</em></button>
        <button type="button" onClick={() => setView("route")}><span className={styles.infoMark} tabIndex={0} aria-label="Route information" data-tip="Jump directly to a destination in Work Sync.">i</span><b>Route</b><em>›</em></button>
        <button type="button" onClick={() => setView("turbo")}><span className={styles.infoMark} tabIndex={0} aria-label="Turbo information" data-tip="Send written input to Workspace or a new table.">i</span><b>Turbo</b><em>›</em></button>
        <hr />
        <button type="button" onClick={() => setView("preferences")}><span>⚙</span><b>Preferences</b><em>›</em></button>
      </div>}

      {view === "macro" && <div className={styles.list}>
        <p className={styles.hint}>Run a saved action inside Work Sync.</p>
        <button type="button" onClick={() => sendTableCommand({ action: "add-table" })}><span>▦</span><b>Add table</b></button>
        <button type="button" onClick={() => sendTableCommand({ action: "add-row" })}><span>＋</span><b>Add table record</b></button>
        <button type="button" onClick={() => sendTableCommand({ action: "add-column" })}><span>▥</span><b>Add text column</b></button>
        <button type="button" onClick={() => sendWorkspaceText("New workspace note")}><span>▤</span><b>New workspace note</b></button>
        {presets.length > 0 && <><hr /><p className={styles.sectionLabel}>Text presets</p>{presets.map((preset) => <button type="button" key={preset.id} onClick={() => sendWorkspaceText(preset.text)}><span>→</span><b>{preset.label}</b></button>)}</>}
      </div>}

      {view === "route" && <div className={styles.list}>
        <p className={styles.hint}>Open a destination in this app.</p>
        {ROUTES.map(([label, href, icon]) => <button type="button" key={href} className={pathname === href ? styles.active : ""} onClick={() => { router.push(href); close(); }}><span>{icon}</span><b>{label}</b>{pathname === href && <em>Current</em>}</button>)}
      </div>}

      {view === "turbo" && <form className={styles.form} onSubmit={(event) => { event.preventDefault(); sendWorkspaceText(turboText); }}>
        <label>Input prompt<textarea value={turboText} onChange={(event) => setTurboText(event.target.value)} placeholder="Write content for a destination…" autoFocus /></label>
        <div className={styles.actions}><button type="submit" disabled={!turboText.trim()}>Write in Workspace</button><button type="button" disabled={!turboText.trim()} onClick={() => sendTableCommand({ action: "add-table", text: turboText })}>Make a new table</button></div>
      </form>}

      {view === "preferences" && <div className={styles.preferences}>
        <p className={styles.hint}>Create text macros stored only in this browser.</p>
        <label>Name<input value={presetLabel} onChange={(event) => setPresetLabel(event.target.value)} placeholder="Weekly update" /></label>
        <label>Text<textarea value={presetText} onChange={(event) => setPresetText(event.target.value)} placeholder="Insert this text in Workspace…" /></label>
        <button type="button" className={styles.save} disabled={!presetLabel.trim() || !presetText.trim()} onClick={savePreset}>Save macro</button>
        {presets.length > 0 && <div className={styles.saved}>{presets.map((preset) => <div key={preset.id}><span><strong>{preset.label}</strong><small>{preset.text}</small></span><button type="button" aria-label={`Delete ${preset.label}`} onClick={() => removePreset(preset.id)}>×</button></div>)}</div>}
      </div>}
    </section>}
    <button type="button" className={styles.trigger} aria-label="Open AO macro key menu" aria-expanded={open} onClick={() => { setOpen((current) => !current); if (open) setView("main"); }}><AOLogo /></button>
  </div>;
}
