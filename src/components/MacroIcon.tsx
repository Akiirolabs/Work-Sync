import type { SVGProps } from "react";

export type MacroIconName = "add" | "back" | "calendar" | "check" | "chevron" | "close" | "computer" | "delete" | "document" | "folder" | "history" | "info" | "macro" | "pin" | "route" | "search" | "settings" | "sources" | "table" | "text" | "todo" | "turbo" | "vault" | "verify";

export function MacroIcon({ name, className, ...props }: { name: MacroIconName; className?: string } & SVGProps<SVGSVGElement>) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...props };
  switch (name) {
    case "add": return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "back": return <svg {...common}><path d="m14 6-6 6 6 6M8 12h11" /></svg>;
    case "calendar": return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
    case "check": return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "chevron": return <svg {...common}><path d="m9 5 7 7-7 7" /></svg>;
    case "close": return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "computer": return <svg {...common}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>;
    case "delete": return <svg {...common}><path d="M4 7h16M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
    case "document": return <svg {...common}><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" /></svg>;
    case "folder": return <svg {...common}><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
    case "history": return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2" /></svg>;
    case "info": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
    case "macro": return <svg {...common}><path d="m13 2-9 12h7l-1 8 10-13h-7z" /></svg>;
    case "pin": return <svg {...common}><path d="m9 4 6 6m-8 1 6 6m-1-11 5 5-3 3 2 4-6-2-3 3-5-5 3-3-2-4zM5 19l-2 2" /></svg>;
    case "route": return <svg {...common}><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h3a3 3 0 0 0 3-3v-3a3 3 0 0 1 3-3h1" /></svg>;
    case "search": return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H5v-3h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3h-.2a1.7 1.7 0 0 0-1.6 1z" /></svg>;
    case "sources": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M5 6h4M15 6h4M5 18h4M15 18h4M9 7.5l2 2M15 7.5l-2 2M9 16.5l2-2M15 16.5l-2-2" /></svg>;
    case "table": return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16M15 4v16" /></svg>;
    case "text": return <svg {...common}><path d="M5 5h14M12 5v14M8 19h8" /></svg>;
    case "todo": return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
    case "turbo": return <svg {...common}><path d="M4 12h12M12 6l6 6-6 6" /><path d="M4 6h4M4 18h4" /></svg>;
    case "vault": return <svg {...common}><path d="M5 5h14v14H5zM9 5v14M9 12h10M13 9h3" /></svg>;
    case "verify": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
  }
}

export function macroIconFor(macroId?: string, custom = false): MacroIconName {
  if (custom) return "macro";
  if (macroId?.startsWith("workspace-")) return "document";
  if (macroId?.startsWith("todo-")) return "todo";
  if (macroId?.startsWith("table-") || macroId?.startsWith("row-") || macroId?.startsWith("column-") || macroId?.startsWith("page-")) return "table";
  if (macroId?.startsWith("vault-")) return "vault";
  return "macro";
}
