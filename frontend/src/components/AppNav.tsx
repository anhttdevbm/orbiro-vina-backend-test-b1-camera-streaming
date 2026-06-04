import type { AdminPage } from "../types";

interface Props {
  page: AdminPage;
  onNavigate: (page: AdminPage) => void;
}

const ITEMS: { id: AdminPage; label: string }[] = [
  { id: "grid", label: "Video grid" },
  { id: "cameras", label: "Cameras" },
  { id: "status", label: "Status" },
  { id: "events", label: "Events" },
];

export function AppNav({ page, onNavigate }: Props) {
  return (
    <nav className="app-nav">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`app-nav__btn${page === item.id || (page === "camera-form" && item.id === "cameras") ? " app-nav__btn--active" : ""}`}
          onClick={() => onNavigate(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
