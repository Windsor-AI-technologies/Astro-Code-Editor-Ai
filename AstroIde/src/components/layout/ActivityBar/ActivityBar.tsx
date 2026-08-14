import { useState, useEffect, useRef } from "react";
import {
  Files,
  Search,
  GitBranch,
  Puzzle,
  Bug,
  Cloud,
  Settings,
  User,
  Workflow,
  ChartScatter,
} from "lucide-react";
import "./ActivityBar.css";
import { identifyUser } from '../../../services/analytics';

interface ActivityBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onOpenSettings: () => void;
  onModeChange?: (mode: string) => void;
}

const TOP_ITEMS = [
  { id: "files", icon: Files, title: "Explorador (Ctrl+Shift+E)" },
  { id: "search", icon: Search, title: "Buscar (Ctrl+Shift+F)" },
  { id: "git", icon: GitBranch, title: "Control de código fuente" },
  { id: "debug", icon: Bug, title: "Ejecutar y depurar" },
  { id: "extensions", icon: Puzzle, title: "Extensiones" },
  { id: "containers", icon: Cloud, title: "Contenedores" },
  { id: "flowchart", icon: Workflow, title: "Diagrama de flujo" },
  { id: "chartScatter", icon: ChartScatter, title: "Analatycs" },
];

export default function ActivityBar({
  activeView,
  onViewChange,
  onOpenSettings,
  onModeChange,
}: ActivityBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);

  // Load user data from localStorage (saved at login time)
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("astro-user") || "null");
      if (user) {
        if (user.email) setUserEmail(user.email);
        if (user.name) setUserName(user.name);
        if (user.avatar) setUserAvatar(user.avatar);
      }
    } catch {}

    // Sync plan from backend on app start
    const session = JSON.parse(localStorage.getItem("astro-session") || "null");
    if (session?.access_token) {
      fetch("https://astro-backend.garzaromerojeshuaabiram2019ktv.workers.dev/auth/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.email) {
            setUserEmail(data.email);
            if (data.name) setUserName(data.name);
            if (data.avatar) setUserAvatar(data.avatar);
            const plan = data.plan || "free";
            localStorage.setItem("astro-user-plan", JSON.stringify({
              id: plan,
              label: plan.charAt(0).toUpperCase() + plan.slice(1),
              perlAddon: data.perl_addon || false,
            }));
            // Identify in PostHog
            identifyUser(data.id, data.email, plan);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Close popup on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  return (
    <div className="activity-bar">
      <div className="activity-top">
        {TOP_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`activity-btn ${activeView === item.id ? "active" : ""}`}
            onClick={() => {
              if (item.id === "flowchart") {
                onModeChange?.("flowchart");
              } 
              if(item.id === "chartScatter"){
                onModeChange?.("chartScatter")
              }
              else {
                onModeChange?.("ide");
              }
              onViewChange(item.id);
            }}
            title={item.title}
          >
            <item.icon size={22} />
          </button>
        ))}
      </div>

      <div className="activity-bottom">
        <div className="activity-profile-wrapper">
          <button className="activity-btn activity-btn--profile" title="Cuenta" onClick={() => setProfileOpen(!profileOpen)}>
            {userAvatar ? (
              <img src={userAvatar} alt="" className="activity-avatar" referrerPolicy="no-referrer" />
            ) : (
              <User size={22} />
            )}
          </button>

          {profileOpen && (
            <div className="activity-profile-popup" ref={popupRef}>
              <div className="profile-popup-header">
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="profile-popup-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <div className="profile-popup-avatar-placeholder"><User size={24} /></div>
                )}
                <div className="profile-popup-info">
                  <span className="profile-popup-name">{userName || "User"}</span>
                  <span className="profile-popup-email">{userEmail || "Not signed in"}</span>
                </div>
              </div>

              <div className="profile-popup-divider" />

              {/* Usage section */}
              <div className="profile-popup-usage">
                <div className="profile-popup-usage-header">
                  <span>Credits</span>
                  <span className="profile-popup-plan">{(() => { try { return JSON.parse(localStorage.getItem("astro-user-plan") || "{}").label || "Free"; } catch { return "Free"; } })()}</span>
                </div>
                <div className="profile-popup-bar">
                  <div className="profile-popup-bar-fill" style={{ width: "12%" }} />
                </div>
                <span className="profile-popup-usage-text">120 / 1,000 tokens used</span>
              </div>

              <div className="profile-popup-divider" />

              <button className="profile-popup-btn" onClick={async () => {
                setProfileOpen(false);
                try {
                  const { invoke } = await import("@tauri-apps/api/core");
                  await invoke("perl_open_url", { url: "https://astro-backend.garzaromerojeshuaabiram2019ktv.workers.dev/plans" });
                } catch { window.open("https://astro-backend.garzaromerojeshuaabiram2019ktv.workers.dev/plans", "_blank"); }
              }}>
                Manage Plan
              </button>
              <button className="profile-popup-signout" onClick={() => {
                localStorage.removeItem("astro-auth-skip");
                localStorage.removeItem("astro-session");
                localStorage.removeItem("astro-user");
                window.location.reload();
              }}>
                Sign Out
              </button>
            </div>
          )}
        </div>
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
