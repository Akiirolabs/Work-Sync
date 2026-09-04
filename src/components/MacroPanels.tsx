"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { AO_MACROS_CHANGED_EVENT, AO_MACROS_KEY, AO_OPEN_MACRO_MENU_EVENT, AO_RUN_MAIN_MACRO_EVENT, type AOMacroPreset } from "@/lib/ao-macro";
import { userStorageKey } from "@/lib/user-storage";
import { MacroIcon, macroIconFor } from "./MacroIcon";
import styles from "./MacroPanels.module.css";

const LIMIT = 6;
const RADIAL_SIZE = 150;
const MOBILE_RADIAL_SIZE = 124;
const EDGE_MARGIN = 8;
const RADIAL_POSITION_KEY = "work-sync:macro-panel-position";
const RADIAL_OPEN_KEY = "work-sync:macro-panel-open";
type Position = { left: number; top: number };

function currentRadialSize() {
  return window.matchMedia("(max-width: 700px)").matches ? MOBILE_RADIAL_SIZE : RADIAL_SIZE;
}

function readMainMacros(): AOMacroPreset[] {
  try {
    const value = JSON.parse(localStorage.getItem(userStorageKey(AO_MACROS_KEY)) ?? "[]") as AOMacroPreset[];
    return value.filter((item) => item.main).sort((a, b) => (a.mainOrder ?? 0) - (b.mainOrder ?? 0)).slice(0, LIMIT);
  } catch { return []; }
}

function MacroButtons({ items, radial = false, close, onShowTooltip, onHideTooltip }: { items: AOMacroPreset[]; radial?: boolean; close?: () => void; onShowTooltip?: (button: HTMLButtonElement, label: string) => void; onHideTooltip?: () => void }) {
  if (!items.length) return <p className={styles.empty}>Choose Main Macros in Vault.</p>;
  return <div className={radial ? styles.radialButtons : styles.grid}>{items.map((item, index) => <button
    type="button" key={item.id} aria-label={`Run ${item.label}`}
    style={radial ? { "--macro-index": index, "--macro-count": items.length } as React.CSSProperties : undefined}
    onPointerEnter={(event) => onShowTooltip?.(event.currentTarget, item.label)} onPointerLeave={onHideTooltip}
    onFocus={(event) => onShowTooltip?.(event.currentTarget, item.label)} onBlur={onHideTooltip}
    onClick={() => { window.dispatchEvent(new CustomEvent(AO_RUN_MAIN_MACRO_EVENT, { detail: { presetId: item.id } })); close?.(); onHideTooltip?.(); }}
  ><MacroIcon name={macroIconFor(item.macroId, Boolean(item.steps?.length), item.icon)} className={styles.macroIcon} />{!radial && <small role="tooltip">{item.label}</small>}</button>)}</div>;
}

export function MacroPanels({ onAgent }: { onAgent: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const radial = useRef<HTMLElement>(null);
  const drag = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [items, setItems] = useState<AOMacroPreset[]>([]);
  const [compactOpen, setCompactOpen] = useState(false);
  const [radialOpen, setRadialOpen] = useState(false);
  const [radialPosition, setRadialPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const [radialTooltip, setRadialTooltip] = useState<{ label: string; left: number; top: number } | null>(null);
  const refresh = () => setItems(readMainMacros());

  function clampPosition(position: Position): Position {
    const size = currentRadialSize();
    return {
      left: Math.max(EDGE_MARGIN, Math.min(position.left, window.innerWidth - size - EDGE_MARGIN)),
      top: Math.max(EDGE_MARGIN, Math.min(position.top, window.innerHeight - size - EDGE_MARGIN)),
    };
  }

  function initialPosition(): Position {
    try {
      const saved = JSON.parse(localStorage.getItem(userStorageKey(RADIAL_POSITION_KEY)) ?? "null") as Partial<Position> | null;
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) return clampPosition({ left: saved.left!, top: saved.top! });
    } catch { /* use the default position */ }
    return clampPosition({ left: 18, top: window.innerHeight - currentRadialSize() - 17 });
  }

  function toggleRadial() {
    refresh(); setCompactOpen(false);
    setRadialTooltip(null);
    setRadialPosition((current) => current ?? initialPosition());
    setRadialOpen((value) => { const next = !value; sessionStorage.setItem(RADIAL_OPEN_KEY, String(next)); return next; });
  }

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const panel = radial.current; if (!panel) return;
    const rect = panel.getBoundingClientRect();
    drag.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); event.preventDefault();
  }

  function showRadialTooltip(button: HTMLButtonElement, label: string) {
    const rect = button.getBoundingClientRect(); const width = Math.min(190, Math.max(72, label.length * 6 + 16));
    setRadialTooltip({ label, left: Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8)), top: Math.max(8, rect.top - 31) });
  }

  function moveDrag(event: PointerEvent) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    setRadialPosition(clampPosition({ left: event.clientX - drag.current.offsetX, top: event.clientY - drag.current.offsetY }));
  }

  function endDrag(event: Pick<PointerEvent, "pointerId">) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = null; setDragging(false);
    setRadialPosition((current) => { if (current) localStorage.setItem(userStorageKey(RADIAL_POSITION_KEY), JSON.stringify(current)); return current; });
  }

  useEffect(() => { refresh(); setRadialPosition(initialPosition()); setRadialOpen(sessionStorage.getItem(RADIAL_OPEN_KEY) === "true"); window.addEventListener(AO_MACROS_CHANGED_EVENT, refresh); return () => window.removeEventListener(AO_MACROS_CHANGED_EVENT, refresh); }, []);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.ctrlKey && event.key.toLowerCase() === "m") { event.preventDefault(); toggleRadial(); }
      if (event.key === "Escape") setCompactOpen(false);
    }
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setCompactOpen(false); }
    function resize() { setRadialPosition((current) => current ? clampPosition(current) : current); }
    document.addEventListener("keydown", keydown); document.addEventListener("pointerdown", outside); document.addEventListener("pointermove", moveDrag); document.addEventListener("pointerup", endDrag); document.addEventListener("pointercancel", endDrag);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("keydown", keydown); document.removeEventListener("pointerdown", outside); document.removeEventListener("pointermove", moveDrag); document.removeEventListener("pointerup", endDrag); document.removeEventListener("pointercancel", endDrag); window.removeEventListener("resize", resize); };
  }, []);

  return <div ref={root} className={styles.root}>
    <div className={styles.headerActions}>
      <button type="button" aria-expanded={compactOpen} onClick={() => { refresh(); setCompactOpen((value) => !value); }}>Macro Panel</button>
      <button type="button" onClick={onAgent}>Agent</button>
    </div>
    {compactOpen && <section className={styles.compact} role="dialog" aria-label="Macro Panel shortcuts"><header><strong>Main Macros</strong><button type="button" aria-label="Open full Macro menu" onClick={() => window.dispatchEvent(new Event(AO_OPEN_MACRO_MENU_EVENT))}>Vault <MacroIcon name="chevron" /></button></header><MacroButtons items={items} close={() => setCompactOpen(false)} /></section>}
    <button type="button" className={styles.dot} aria-label="Toggle circular Macro Panel" aria-expanded={radialOpen} title="Macro Panel · Ctrl+M" onClick={toggleRadial} />
    {radialOpen && <section ref={radial} className={`${styles.radial}${dragging ? ` ${styles.dragging}` : ""}`} style={radialPosition ? { left: radialPosition.left, top: radialPosition.top } as CSSProperties : undefined} role="dialog" aria-label="Circular Macro Panel"><button type="button" className={styles.radialCenter} aria-label="Move circular Macro Panel" onPointerDown={beginDrag}><span className={styles.liquidChrome} aria-hidden="true" /></button><MacroButtons items={items} radial onShowTooltip={showRadialTooltip} onHideTooltip={() => setRadialTooltip(null)} /></section>}
    {radialTooltip && createPortal(<div className={styles.radialTooltip} style={{ left: radialTooltip.left, top: radialTooltip.top }} role="tooltip">{radialTooltip.label}</div>, document.body)}
  </div>;
}
