"use client";

import { useEffect, useRef, useState } from "react";
import { AO_MACROS_CHANGED_EVENT, AO_MACROS_KEY, AO_OPEN_MACRO_MENU_EVENT, AO_RUN_MAIN_MACRO_EVENT, type AOMacroPreset } from "@/lib/ao-macro";
import { userStorageKey } from "@/lib/user-storage";
import styles from "./MacroPanels.module.css";

const LIMIT = 6;

function readMainMacros(): AOMacroPreset[] {
  try {
    const value = JSON.parse(localStorage.getItem(userStorageKey(AO_MACROS_KEY)) ?? "[]") as AOMacroPreset[];
    return value.filter((item) => item.main).sort((a, b) => (a.mainOrder ?? 0) - (b.mainOrder ?? 0)).slice(0, LIMIT);
  } catch { return []; }
}

function MacroButtons({ items, radial = false, close }: { items: AOMacroPreset[]; radial?: boolean; close: () => void }) {
  if (!items.length) return <p className={styles.empty}>Choose Main Macros in Vault.</p>;
  return <div className={radial ? styles.radialButtons : styles.grid}>{items.map((item, index) => <button
    type="button" key={item.id} title={item.label} aria-label={`Run ${item.label}`}
    style={radial ? { "--macro-index": index, "--macro-count": items.length } as React.CSSProperties : undefined}
    onClick={() => { window.dispatchEvent(new CustomEvent(AO_RUN_MAIN_MACRO_EVENT, { detail: { presetId: item.id } })); close(); }}
  ><span>{item.icon || "◇"}</span><small>{item.label}</small></button>)}</div>;
}

export function MacroPanels({ onAgent }: { onAgent: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<AOMacroPreset[]>([]);
  const [compactOpen, setCompactOpen] = useState(false);
  const [radialOpen, setRadialOpen] = useState(false);
  const refresh = () => setItems(readMainMacros());

  useEffect(() => { refresh(); window.addEventListener(AO_MACROS_CHANGED_EVENT, refresh); return () => window.removeEventListener(AO_MACROS_CHANGED_EVENT, refresh); }, []);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.ctrlKey && event.key.toLowerCase() === "m") { event.preventDefault(); refresh(); setCompactOpen(false); setRadialOpen((value) => !value); }
      if (event.key === "Escape") { setCompactOpen(false); setRadialOpen(false); }
    }
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) { setCompactOpen(false); setRadialOpen(false); } }
    document.addEventListener("keydown", keydown); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", keydown); document.removeEventListener("pointerdown", outside); };
  }, []);

  return <div ref={root} className={styles.root}>
    <div className={styles.headerActions}>
      <button type="button" aria-expanded={compactOpen} onClick={() => { refresh(); setRadialOpen(false); setCompactOpen((value) => !value); }}>Macro Panel</button>
      <button type="button" onClick={onAgent}>Agent</button>
    </div>
    {compactOpen && <section className={styles.compact} role="dialog" aria-label="Macro Panel shortcuts"><header><strong>Main Macros</strong><button type="button" aria-label="Open full Macro menu" onClick={() => window.dispatchEvent(new Event(AO_OPEN_MACRO_MENU_EVENT))}>Vault ›</button></header><MacroButtons items={items} close={() => setCompactOpen(false)} /></section>}
    <button type="button" className={styles.dot} aria-label="Open circular Macro Panel" aria-expanded={radialOpen} title="Macro Panel · Ctrl+M" onClick={() => { refresh(); setCompactOpen(false); setRadialOpen((value) => !value); }} />
    {radialOpen && <section className={styles.radial} role="dialog" aria-label="Circular Macro Panel"><span className={styles.radialCenter}>AO</span><MacroButtons items={items} radial close={() => setRadialOpen(false)} /></section>}
  </div>;
}
