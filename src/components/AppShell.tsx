"use client";

import { Shell, Rail } from "@/ui";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AccountSettings } from "./AccountSettings";
import { AOMacroMenu } from "./AOMacroMenu";
import { MacroPanels } from "./MacroPanels";
import { VoiceAgentPanel } from "./VoiceAgentPanel";

const NAV = [
  { id: "workspace", label: "Workspace", href: "/" },
  { id: "todo", label: "To Do", href: "/todo" },
  { id: "tables", label: "Tables", href: "/tables" },
  { id: "sources", label: "Sources", href: "/sources" },
  { id: "verify", label: "Verify", href: "/verify" },
  { id: "history", label: "History", href: "/history" },
  { id: "connect", label: "Connect", href: "/connect" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [agentOpen, setAgentOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);

  return (
    <Shell statusContent={<MacroPanels onAgent={() => setAgentOpen((value) => !value)} />} topRight={<AccountSettings />}>
      <AOMacroMenu />
      <VoiceAgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} />
      <Rail
        label="Navigate"
        collapsed={railCollapsed}
        onToggle={() => setRailCollapsed((value) => !value)}
        items={NAV.map((item) => ({
          ...item,
          active:
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`),
        }))}
      />
      {children}
    </Shell>
  );
}
