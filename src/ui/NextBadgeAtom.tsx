"use client";

import { useEffect, useState } from "react";
import { LiquidChromeOrb } from "./LiquidChromeOrb";

type Box = { top: number; left: number; size: number };

function collectRoots(): ParentNode[] {
  const hosts: ParentNode[] = [document.documentElement];
  document.querySelectorAll("nextjs-portal").forEach((portal) => {
    hosts.push(portal);
    if (portal.shadowRoot) hosts.push(portal.shadowRoot);
  });
  document.querySelectorAll("iframe").forEach((frame) => {
    try {
      const doc = frame.contentDocument;
      if (doc) hosts.push(doc);
    } catch {
      /* cross-origin */
    }
  });
  return hosts;
}

function findNextBadgeButton(): HTMLElement | null {
  for (const root of collectRoots()) {
    const btn =
      (root.querySelector("#next-logo") as HTMLElement | null) ??
      (root.querySelector("[data-next-mark]") as HTMLElement | null) ??
      (root.querySelector('button[aria-label*="Next.js"]') as HTMLElement | null) ??
      (root.querySelector('button[aria-label*="Dev Tools"]') as HTMLElement | null);
    if (btn) return btn;
  }
  return null;
}

function readBox(btn: HTMLElement): Box {
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  return { top: rect.top, left: rect.left, size };
}

/** Same LiquidChromeOrb as the top bar, parked on the Next.js N. Clicks still open that popup. */
export function NextBadgeAtom() {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    let btn: HTMLElement | null = null;
    let frame = 0;

    const sync = () => {
      const found = findNextBadgeButton();
      if (found) btn = found;
      if (!btn) {
        setBox(null);
        return;
      }
      setBox(readBox(btn));
    };

    const tick = () => {
      if (btn) setBox(readBox(btn));
      frame = window.requestAnimationFrame(tick);
    };

    sync();
    frame = window.requestAnimationFrame(tick);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("resize", sync);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  if (process.env.NODE_ENV !== "development" || !box) return null;

  return (
    <span
      className="ms-next-atom"
      aria-hidden
      style={{
        position: "fixed",
        top: box.top,
        left: box.left,
        width: box.size,
        height: box.size,
        zIndex: 2147483646,
        pointerEvents: "none",
        display: "grid",
        placeItems: "center",
      }}
    >
      <LiquidChromeOrb size={Math.max(16, Math.round(box.size * 0.92))} />
    </span>
  );
}
