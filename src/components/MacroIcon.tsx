import type { SVGProps } from "react";

export type MacroIconName = "add" | "back" | "book" | "branch" | "build" | "calendar" | "check" | "chevron" | "cloud" | "close" | "code" | "computer" | "database" | "delete" | "document" | "flask" | "folder" | "graduation" | "history" | "idea" | "info" | "layers" | "macro" | "pin" | "route" | "search" | "settings" | "sources" | "table" | "terminal" | "text" | "todo" | "tools" | "turbo" | "vault" | "verify";

export const MACRO_ICON_OPTIONS: ReadonlyArray<{ name: MacroIconName; label: string }> = [
  { name: "macro", label: "Macro" }, { name: "document", label: "Document" }, { name: "text", label: "Text" }, { name: "todo", label: "To Do" },
  { name: "table", label: "Table" }, { name: "folder", label: "Folder" }, { name: "vault", label: "Vault" }, { name: "computer", label: "Computer" },
  { name: "calendar", label: "Calendar" }, { name: "history", label: "History" }, { name: "route", label: "Route" }, { name: "turbo", label: "Turbo" },
  { name: "verify", label: "Verify" }, { name: "sources", label: "Sources" }, { name: "settings", label: "Settings" }, { name: "search", label: "Search" },
  { name: "check", label: "Check" }, { name: "pin", label: "Pin" }, { name: "add", label: "Add" },
  { name: "code", label: "Code" }, { name: "terminal", label: "Terminal" }, { name: "database", label: "Database" }, { name: "cloud", label: "Cloud" },
  { name: "branch", label: "Code branch" }, { name: "build", label: "Build" }, { name: "tools", label: "Tools" }, { name: "layers", label: "Layers" },
  { name: "book", label: "Book" }, { name: "graduation", label: "Study" }, { name: "flask", label: "Lab" }, { name: "idea", label: "Idea" },
];

export function isMacroIconName(value?: string): value is MacroIconName { return MACRO_ICON_OPTIONS.some((icon) => icon.name === value); }

export function MacroIcon({ name, className, ...props }: { name: MacroIconName; className?: string } & SVGProps<SVGSVGElement>) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...props };
  switch (name) {
    case "add": return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "back": return <svg {...common}><path d="m14 6-6 6 6 6M8 12h11" /></svg>;
    case "book": return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5zM4 5.5v16M8 7h8M8 11h8" /></svg>;
    case "branch": return <svg {...common}><circle cx="6" cy="5" r="2" /><circle cx="18" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M6 7v7a5 5 0 0 0 5 5h5M6 7a5 5 0 0 0 5 5h7V7" /></svg>;
    case "build": return <svg {...common}><path d="m14 4 6 6-9 9-6-6zM11 7l6 6M5 19l-2 2M19 5l2-2" /></svg>;
    case "calendar": return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
    case "check": return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "chevron": return <svg {...common}><path d="m9 5 7 7-7 7" /></svg>;
    case "cloud": return <svg {...common}><path d="M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.2 8.5 4.2 4.2 0 0 0 7 18z" /></svg>;
    case "close": return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "computer": return <svg {...common}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>;
    case "code": return <svg {...common}><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></svg>;
    case "database": return <svg {...common}><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" /></svg>;
    case "delete": return <svg {...common}><path d="M4 7h16M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
    case "document": return <svg {...common}><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" /></svg>;
    case "flask": return <svg {...common}><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3M8 15h8" /></svg>;
    case "folder": return <svg {...common}><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
    case "history": return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2" /></svg>;
    case "graduation": return <svg {...common}><path d="m3 10 9-5 9 5-9 5zM7 12v4c2.8 2 7.2 2 10 0v-4M21 10v6" /></svg>;
    case "idea": return <svg {...common}><path d="M9 18h6M10 22h4M8.5 15.5A6.5 6.5 0 1 1 15.5 15.5c-1.1.8-1.5 1.7-1.5 2.5h-4c0-.8-.4-1.7-1.5-2.5z" /></svg>;
    case "info": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
    case "layers": return <svg {...common}><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5" /></svg>;
    case "macro": return <svg {...common}><path d="m13 2-9 12h7l-1 8 10-13h-7z" /></svg>;
    case "pin": return <svg {...common}><path d="m9 4 6 6m-8 1 6 6m-1-11 5 5-3 3 2 4-6-2-3 3-5-5 3-3-2-4zM5 19l-2 2" /></svg>;
    case "route": return <svg {...common}><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h3a3 3 0 0 0 3-3v-3a3 3 0 0 1 3-3h1" /></svg>;
    case "search": return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H5v-3h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3h-.2a1.7 1.7 0 0 0-1.6 1z" /></svg>;
    case "sources": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M5 6h4M15 6h4M5 18h4M15 18h4M9 7.5l2 2M15 7.5l-2 2M9 16.5l2-2M15 16.5l-2-2" /></svg>;
    case "table": return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16M15 4v16" /></svg>;
    case "terminal": return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M12 15h5" /></svg>;
    case "text": return <svg {...common}><path d="M5 5h14M12 5v14M8 19h8" /></svg>;
    case "todo": return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
    case "tools": return <svg {...common}><path d="M15 5a4 4 0 0 0-5 5L4 16a2 2 0 1 0 3 3l6-6a4 4 0 0 0 5-5l-3 3-3-3z" /></svg>;
    case "turbo": return <svg {...common}><path d="M4 12h12M12 6l6 6-6 6" /><path d="M4 6h4M4 18h4" /></svg>;
    case "vault": return <svg {...common}><path d="M5 5h14v14H5zM9 5v14M9 12h10M13 9h3" /></svg>;
    case "verify": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
  }
}

export function macroIconFor(macroId?: string, custom = false, selectedIcon?: string): MacroIconName {
  if (isMacroIconName(selectedIcon)) return selectedIcon;
  if (custom) return "macro";
  if (macroId?.startsWith("workspace-")) return "document";
  if (macroId?.startsWith("todo-")) return "todo";
  if (macroId?.startsWith("table-") || macroId?.startsWith("row-") || macroId?.startsWith("column-") || macroId?.startsWith("page-")) return "table";
  if (macroId?.startsWith("vault-")) return "vault";
  return "macro";
}
