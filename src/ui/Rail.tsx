export type RailItem = {
  id: string;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
};

export function Rail({ label, items, collapsed = false, onToggle }: { label?: string; items: RailItem[]; collapsed?: boolean; onToggle?: () => void }) {
  return (
    <nav className={`ms-rail${collapsed ? " is-collapsed" : ""}`} aria-label={label ?? "Navigation"}>
      <div className="ms-rail-head">{label ? <div className="ms-rail-label">{label}</div> : null}<button type="button" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} onClick={onToggle}>{collapsed ? "»" : "«"}</button></div>
      {items.map((item) => {
        const className = `ms-rail-item${item.active ? " is-active" : ""}`;
        if (item.href) {
          return (
            <a key={item.id} className={className} href={item.href}>
              {item.label}
            </a>
          );
        }
        return (
          <button key={item.id} type="button" className={className} onClick={item.onClick}>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
