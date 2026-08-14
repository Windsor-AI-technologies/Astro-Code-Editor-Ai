import { useState, useEffect, lazy, Suspense } from "react";
import { useSettingsCtx } from "./contexts/SettingsContext";
import ModeSwitcher, { type AppMode } from "./components/ui/ModeSwitcher/ModeSwitcher";
import TitleBarSlot from "./components/layout/slots/TitleBarSlot";
import ActivityBarSlot from "./components/layout/slots/ActivityBarSlot";
import AIPanelSlot from "./components/layout/slots/AIPanelSlot";
import SidebarSlot from "./components/layout/slots/SidebarSlot";
import EditorSlot from "./components/layout/slots/EditorSlot";
import TerminalSlot from "./components/layout/slots/TerminalSlot";
import StatusBarSlot from "./components/layout/slots/StatusBarSlot";
import PalettesSlot from "./components/layout/slots/PalettesSlot";
import Notification from "./components/ui/Notification/Notification";
import { canAccessFeature } from "./features/auth/plan";
import UpgradeWall from "./features/auth/UpgradeWall";
import { trackModeSwitch, trackAppOpened } from "./services/analytics";

// IDE mode imports (always loaded — core of the app)
import AgentView from "./features/agent/AgentView";

// Lazy load heavy modes — only mounted when active
const DesignView      = lazy(() => import("./features/design/DesignView"));
const ElectronicsView = lazy(() => import("./features/electronics/ElectronicsView"));
const DatabaseView    = lazy(() => import("./features/DataBase/database"));
const MusicView       = lazy(() => import("./features/music/MusicView"));
const FlowchartView   = lazy(() => import("./features/flowchart/FlowchartView"));
const Analatycs       = lazy(() => import("./features/analitycs/analitycs"));

function ModeLoader() {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg-0)", gap: 16
    }}>
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" style={{ animation: "spin 1.5s linear infinite" }}>
        <circle cx="24" cy="24" r="20" stroke="var(--accent)" strokeWidth="2.5" strokeDasharray="100 26" fill="none" opacity="0.8"/>
        <circle cx="24" cy="24" r="3" fill="var(--accent)"/>
      </svg>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.5px" }}>Loading...</span>
    </div>
  );
}

export default function AppLayout() {
  const { settings } = useSettingsCtx();
  const acrylicOn = settings["workbench.acrylic"];
  const [appMode, setAppMode] = useState<AppMode>("ide");

  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode);
    trackModeSwitch(mode);
  };

  useEffect(() => {
    try {
      const plan = JSON.parse(localStorage.getItem("astro-user-plan") || "{}").id || "free";
      trackAppOpened(plan);
    } catch {}
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { type, target } = (e as CustomEvent).detail;
      if (type === "switch_mode" && target) handleModeChange(target as AppMode);
      else if (type === "open_settings") window.dispatchEvent(new CustomEvent("toggle-settings"));
      else if (type === "open_terminal") window.dispatchEvent(new CustomEvent("toggle-terminal"));
    };
    window.addEventListener("astro-action", handler);
    return () => window.removeEventListener("astro-action", handler);
  }, []);

  return (
    <div className={`app${acrylicOn ? " acrylic-on" : ""}`}>
      <TitleBarSlot modeSwitcher={<ModeSwitcher mode={appMode} onChange={handleModeChange} />} />

      <div className="app-body">
        {/* ActivityBar — always visible, never lazy, never inside Suspense */}
        <ActivityBarSlot onModeChange={(mode) => handleModeChange(mode as AppMode)} />

        {/* IDE Mode — always mounted (core, no lazy) */}
        <div className={`mode-view ${appMode === "ide" ? "mode-active" : "mode-hidden"}`}>
          <AIPanelSlot position="left" />
          <SidebarSlot position="left" />
          <EditorSlot />
          <SidebarSlot position="right" />
          <AIPanelSlot position="right" />
        </div>

        {/* Agent Mode */}
        <div className={`mode-view ${appMode === "agent" ? "mode-active" : "mode-hidden"}`}>
          {canAccessFeature("agent")
            ? <AgentView />
            : <UpgradeWall feature="Agent Mode" description="AI-powered coding assistant that reads your files, writes code, and executes commands." />}
        </div>

        {/* Lazy modes — only mounted when active, Suspense per-mode */}
        {appMode === "design" && (
          <div className="mode-view mode-active">
            <Suspense fallback={<ModeLoader />}><DesignView /></Suspense>
          </div>
        )}

        {appMode === "electronics" && (
          <div className="mode-view mode-active">
            <Suspense fallback={<ModeLoader />}>
              {canAccessFeature("electronics")
                ? <ElectronicsView />
                : <UpgradeWall feature="Electronics Mode" description="Circuit simulation, component library, and schematic design tools." />}
            </Suspense>
          </div>
        )}

        {appMode === "data" && (
          <div className="mode-view mode-active">
            <Suspense fallback={<ModeLoader />}><DatabaseView /></Suspense>
          </div>
        )}

        {appMode === "music" && (
          <div className="mode-view mode-active">
            <Suspense fallback={<ModeLoader />}><MusicView /></Suspense>
          </div>
        )}

        {appMode === "flowchart" && (
          <div className="mode-view mode-active">
            <Suspense fallback={<ModeLoader />}><FlowchartView /></Suspense>
          </div>
        )}

        {appMode === "chartScatter" && (
          <div className="mode-view mode-active">
            <Suspense fallback={<ModeLoader />}>
              {canAccessFeature("analytics")
                ? <Analatycs />
                : <UpgradeWall feature="Analytics" description="Jupyter-like Python notebooks powered by Pyodide." />}
            </Suspense>
          </div>
        )}
      </div>

      {appMode === "ide" && <TerminalSlot />}
      <StatusBarSlot />
      <PalettesSlot />
      <Notification />
    </div>
  );
}
