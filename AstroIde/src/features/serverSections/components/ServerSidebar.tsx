/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { Server, Settings, Activity, Users, LayoutDashboard } from "lucide-react";

export type ServerSectionId =
  | "dashboard"
  | "connection"
  | "settings"
  | "usage"
  | "profiles";

interface ServerNavItem {
  id: ServerSectionId;
  label: string;
  icon: typeof Server;
}

export const SERVER_NAV: ServerNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "connection", label: "Conexión", icon: Server },
  { id: "settings", label: "Configuración", icon: Settings },
  { id: "usage", label: "Usage", icon: Activity },
  { id: "profiles", label: "Profiles", icon: Users },
];

interface ServerSidebarProps {
  activeSection: ServerSectionId;
  onSelect: (id: ServerSectionId) => void;
  onDisconnect: () => void;
}

export default function ServerSidebar({ activeSection, onSelect, onDisconnect }: ServerSidebarProps) {
  return (
    <aside className="sidebar-server">
      <div className="sidebar-server-header">
        <h3>Servidor</h3>
      </div>

      <ul className="sidebar-server-list">
        {SERVER_NAV.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`sidebar-server-item${item.id === activeSection ? " active" : ""}`}
              onClick={() => onSelect(item.id)}
            >
              <item.icon size={16} />
              <span className="sidebar-server-name">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="sidebar-server-footer">
        <button
          className="sidebar-disconnect"
          type="button"
          onClick={onDisconnect}
        >
          Desconectar
        </button>
      </div>
    </aside>
  );
}
