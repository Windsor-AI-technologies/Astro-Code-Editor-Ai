import {
  Files,
  Search,
  GitBranch,
  Puzzle,
  Bug,
  // Boxes,
  Settings,
  User,
} from "lucide-react";
import "./ActivityBar.css";

interface ActivityBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onOpenSettings: () => void;
}

const TOP_ITEMS = [
  { id: "files", icon: Files, title: "Explorador (Ctrl+Shift+E)" },
  { id: "search", icon: Search, title: "Buscar (Ctrl+Shift+F)" },
  { id: "git", icon: GitBranch, title: "Control de código fuente" },
  { id: "debug", icon: Bug, title: "Ejecutar y depurar" },
  { id: "extensions", icon: Puzzle, title: "Extensiones" },
  // { id: 'containers', icon: Boxes, title: 'Contenedores' },
];

export default function ActivityBar({
  activeView,
  onViewChange,
  onOpenSettings,
}: ActivityBarProps) {
  return (
    <div className="activity-bar">
      <div className="activity-top">
        {TOP_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`activity-btn ${activeView === item.id ? "active" : ""}`}
            onClick={() => onViewChange(item.id)}
            title={item.title}
          >
            <item.icon size={22} />
          </button>
        ))}
      </div>

      <div className="activity-bottom">
        <button className="activity-btn" title="Cuenta" onClick={() => {}}>
          <User size={22} />
        </button>
        <button
          className="activity-btn"
          title="Configuración (Ctrl+,)"
          onClick={onOpenSettings}
        >
          <Settings size={22} />
        </button>
      </div>
    </div>
  );
}
