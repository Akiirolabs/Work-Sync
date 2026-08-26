import type { ReactNode } from "react";
import { LiquidChromeOrb } from "./LiquidChromeOrb";

export function Shell({
  statusText,
  children,
}: {
  statusText?: string;
  children: ReactNode;
}) {
  return (
    <div className="ms-shell">
      <div className="ms-shell-status">
        <LiquidChromeOrb size={16} />
        <span className="ms-brand-word">Work Sync</span>
        <span>{statusText ?? "work-sync"}</span>
      </div>
      {children}
    </div>
  );
}
