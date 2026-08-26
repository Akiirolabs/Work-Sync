import type { ReactNode } from "react";
import { LiquidChromeOrb } from "./LiquidChromeOrb";

export function Shell({
  statusText,
  topRight,
  children,
}: {
  statusText?: string;
  topRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="ms-shell">
      <div className="ms-shell-status">
        <LiquidChromeOrb size={16} />
        <span className="ms-brand-word">Work Sync</span>
        <span>{statusText ?? "work-sync"}</span>
        <div className="ms-shell-top-right">{topRight}</div>
      </div>
      {children}
    </div>
  );
}
