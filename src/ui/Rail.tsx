export type RailItem = {
  id: string;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
};

export function Rail({ label, items }: { label?: string; items: RailItem[] }) {
  return (
    <nav className="ms-rail" aria-label={label ?? "Navigation"}>
      {label ? <div className="ms-rail-label">{label}</div> : null}
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
