"use client";

import { Shell, Rail, NextBadgeAtom } from "@/ui";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AccountSettings } from "./AccountSettings";

const NAV = [
  { id: "workspace", label: "Workspace", href: "/" },
  { id: "tables", label: "Tables", href: "/tables" },
  { id: "sources", label: "Sources", href: "/sources" },
  { id: "verify", label: "Verify", href: "/verify" },
  { id: "history", label: "History", href: "/history" },
  { id: "connect", label: "Connect", href: "/connect" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <Shell statusText="local · work sync" topRight={<AccountSettings />}>
      <NextBadgeAtom />
      <Rail
        label="Navigate"
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
