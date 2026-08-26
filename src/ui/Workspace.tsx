import type { ReactNode } from "react";

export function Workspace({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main className="ms-workspace">
      <header className="ms-workspace-header">
        <div>
          <h1 className="ms-workspace-title">{title}</h1>
          {subtitle ? <p className="ms-workspace-sub">{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}
