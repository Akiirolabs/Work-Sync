"use client";

import { useEffect, useState } from "react";
import { Workspace } from "@/ui";
import { AO_MACROS_KEY, AO_OPEN_MACRO_MENU_EVENT, AO_OPEN_VAULT_EVENT, type AOMacroPreset } from "@/lib/ao-macro";
import { userStorageKey } from "@/lib/user-storage";

export default function ConnectPage() {
  const [presets, setPresets] = useState<AOMacroPreset[]>([]);
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(userStorageKey(AO_MACROS_KEY)) ?? "[]") as AOMacroPreset[]; setPresets(Array.isArray(saved) ? saved : []); } catch { setPresets([]); } }, []);
  const macros = presets.filter((item) => item.macroId || item.steps?.length); const text = presets.filter((item) => !item.macroId && !item.steps?.length);
  function openMacroMenu() { window.dispatchEvent(new Event(AO_OPEN_MACRO_MENU_EVENT)); }
  function openVault() { window.dispatchEvent(new Event(AO_OPEN_VAULT_EVENT)); }
  return <Workspace title="Connect" subtitle="Macro Presets and Vault"><div className="ms-connect-page"><section className="ms-panel"><header className="ms-connect-header"><div><h2 className="ms-panel-title">Macro Presets</h2><p>Reusable automation presets available in this workspace.</p></div><button type="button" className="ms-btn ms-btn-primary" onClick={openMacroMenu}>Open presets</button></header><div className="ms-connect-list">{macros.map((preset) => <article key={preset.id}><strong>{preset.label}</strong><small>{preset.steps?.length ? `${preset.steps.length} step custom macro` : "Saved macro preset"}</small></article>)}{!macros.length && <p className="ms-muted">No saved macro presets yet.</p>}</div></section><section className="ms-panel"><header className="ms-connect-header"><div><h2 className="ms-panel-title">Vault</h2><p>Saved text is available only through Vault’s dedicated Saved Text view.</p></div><button type="button" className="ms-btn" onClick={openVault}>Open Vault</button></header><div className="ms-connect-list">{text.map((preset) => <article key={preset.id}><strong>{preset.label}</strong><small>Saved text</small></article>)}{!text.length && <p className="ms-muted">No saved text in Vault.</p>}</div></section></div></Workspace>;
}
