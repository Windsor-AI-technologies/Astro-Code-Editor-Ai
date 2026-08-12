import { useState, useEffect } from "react";
import { useSettingsCtx } from "./contexts/SettingsContext";
import ModeSwitcher, {
  type AppMode,
} from "./components/ui/ModeSwitcher/ModeSwitcher";
import TitleBarSlot from "./components/layout/slots/TitleBarSlot";
import ActivityBarSlot from "./components/layout/slots/ActivityBarSlot";
import AIPanelSlot from "./components/layout/slots/AIPanelSlot";
import SidebarSlot from "./components/layout/slots/SidebarSlot";
import EditorSlot from "./components/layout/slots/EditorSlot";
import TerminalSlot from "./components/layout/slots/TerminalSlot";
import StatusBarSlot from "./components/layout/slots/StatusBarSlot";
import PalettesSlot from "./components/layout/slots/PalettesSlot";
import Notification from "./components/ui/Notification/Notification";
import AgentView from "./features/agent/AgentView";
import { canAccessFeature } from "./features/auth/plan";
import UpgradeWall from "./features/auth/UpgradeWall";
import DesignView from "./features/design/DesignView";
import ElectronicsView from "./features/electronics/ElectronicsView";
import DatabaseView from "./features/DataBase/database";
import MusicView from "./features/music/MusicView";
import FlowchartView from "./features/flowchart/FlowchartView";
import Analatycs from "./features/analitycs/analitycs";

/**
 * AppLayout — Pure layout composition with mode switching.
 * Modes: IDE (default), Agent, Design, Electronics.
 */
export default function AppLayout() {
  const { settings } = useSettingsCtx();
  const acrylicOn = settings["workbench.acrylic"];
  const [appMode, setAppMode] = useState<AppMode>("ide");

  // Listen for Perl actions (switch mode, open terminal, etc.)
  useEffect(() => {
    const handler = (e: Event) => {
      const { type, target } = (e as CustomEvent).detail;
      if (type === 'switch_mode' && target) {
        setAppMode(target as AppMode);
      } else if (type === 'open_settings') {
        // Dispatch to settings toggle
        window.dispatchEvent(new CustomEvent('toggle-settings'));
      } else if (type === 'open_terminal') {
        window.dispatchEvent(new CustomEvent('toggle-terminal'));
      }
    };
    window.addEventListener('astro-action', handler);
    return () => window.removeEventListener('astro-action', handler);
  }, []);

  return (
    <div className={`app${acrylicOn ? " acrylic-on" : ""}`}>
      <TitleBarSlot
        modeSwitcher={<ModeSwitcher mode={appMode} onChange={setAppMode} />}
      />

      <div className="app-body">
        <ActivityBarSlot onModeChange={(mode) => setAppMode(mode as AppMode)} />

        {/* IDE Mode */}
        <div
          className={`mode-view ${appMode === "ide" ? "mode-active" : "mode-hidden"}`}
        >
          <AIPanelSlot position="left" />
          <SidebarSlot position="left" />
          <EditorSlot />
          <SidebarSlot position="right" />
          <AIPanelSlot position="right" />
        </div>

        {/* Agent Mode */}
        <div
          className={`mode-view ${appMode === "agent" ? "mode-active" : "mode-hidden"}`}
        >
          {canAccessFeature("agent") ? <AgentView /> : <UpgradeWall feature="Agent Mode" description="AI-powered coding assistant that reads your files, writes code, and executes commands. Chat with Astro or use Perl voice assistant." />}
        </div>

        {/* Design Mode */}
        <div
          className={`mode-view ${appMode === "design" ? "mode-active" : "mode-hidden"}`}
        >
          <DesignView />
        </div>

        {/* Electronics Mode */}
        <div
          className={`mode-view ${appMode === "electronics" ? "mode-active" : "mode-hidden"}`}
        >
          {canAccessFeature("electronics") ? <ElectronicsView /> : <UpgradeWall feature="Electronics Mode" description="Circuit simulation, component library, and schematic design tools for hardware engineers and students." />}
        </div>

        {/* Data Mode */}
        <div
          className={`mode-view ${appMode === "data" ? "mode-active" : "mode-hidden"}`}
        >
          <DatabaseView />
        </div>

        {/* Music Mode */}
        <div
          className={`mode-view ${appMode === "music" ? "mode-active" : "mode-hidden"}`}
        >
          <MusicView />
        </div>

        {/* Flowchart Mode */}
        <div
          className={`mode-view ${appMode === "flowchart" ? "mode-active" : "mode-hidden"}`}
        >
          <FlowchartView />
        </div>
        <div className={`mode-view ${appMode === "chartScatter" ? "mode-active" : "mode-hidden"}`}>
          {canAccessFeature("analytics") ? <Analatycs /> : <UpgradeWall feature="Analytics" description="Jupyter-like Python notebooks powered by Pyodide. Run pandas, numpy, matplotlib — all in the browser, no install needed." />}
        </div>
      </div>

      {appMode === "ide" && <TerminalSlot />}
      <StatusBarSlot />
      <PalettesSlot />
      <Notification />
    </div>
  );
}
