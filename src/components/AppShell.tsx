"use client";

import { Shell, Rail } from "@/ui";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AccountSettings } from "./AccountSettings";
import { AOMacroMenu } from "./AOMacroMenu";
import { MacroPanels } from "./MacroPanels";
import { AgentSideChat } from "./AgentSideChat";

const NAV = [
  { id: "workspace", label: "Workspace", href: "/" },
  { id: "todo", label: "To Do", href: "/todo" },
  { id: "tables", label: "Tables", href: "/tables" },
  { id: "sources", label: "Sources", href: "/sources" },
  { id: "verify", label: "Verify", href: "/verify" },
  { id: "history", label: "Calendar", href: "/history" },
  { id: "connect", label: "Connect", href: "/connect" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentLauncherOpen, setAgentLauncherOpen] = useState(false);
  const [agentLauncherHidden, setAgentLauncherHidden] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);

  return (
    <Shell statusContent={<MacroPanels onAgent={() => { setAgentLauncherOpen(false); setAgentOpen((value) => !value); }} />} topRight={<AccountSettings />}>
      <AOMacroMenu />
      <AgentSideChat open={agentOpen} onClose={() => setAgentOpen(false)} />
      {!agentOpen && !agentLauncherHidden && <div className="ms-ao-agent-launcher"><button type="button" className="ms-ao-agent-button" aria-label="Open AO Agent menu" title="AO Agent" aria-expanded={agentLauncherOpen} onClick={() => setAgentLauncherOpen((value) => !value)}><img src="/ao-agent.png" alt="" /></button>{agentLauncherOpen && <section className="ms-ao-agent-menu" role="dialog" aria-label="AO Agent menu"><header><strong>AO Agent</strong></header><button type="button" onClick={() => { setAgentLauncherOpen(false); setAgentOpen(true); }}>Open side chat</button><button type="button" onClick={() => { setAgentLauncherOpen(false); setAgentLauncherHidden(true); }}>Hide AO Agent</button></section>}</div>}
      {!agentOpen && agentLauncherHidden && <button type="button" className="ms-ao-agent-restore" aria-label="Show AO Agent" onClick={() => { setAgentLauncherHidden(false); setAgentLauncherOpen(true); }}>‹</button>}
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
