import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsCtx } from "../../contexts/SettingsContext";
import { loadPyodide, installDependencies, runPython, getVariables } from "./services/pyodide";
import type { AnalyticsProject, Cell, Variable, ProjectFile } from "./types";
import WelcomeScreen from "./components/WelcomeScreen";
import NotebookCell from "./components/NotebookCell";
import ProjectSidebar from "./components/ProjectSidebar";
import RightPanel from "./components/RightPanel";
import "./analitycs.css";

let cellCount = 0;
const newId = () => `cell-${++cellCount}`;

function NotebookView({ project, onBack }: { project: AnalyticsProject; onBack: () => void }) {
  const { themeId } = useSettingsCtx();
  const [cells, setCells] = useState<Cell[]>([]);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [kernelStatus, setKernelStatus] = useState<"loading" | "idle" | "busy" | "off">("off");
  const [variables, setVariables] = useState<Variable[]>([]);
  const runRef = useRef<(id: string) => void>(undefined);

  // Init kernel
  useEffect(() => {
    setCells([{ id: newId(), type: "code", content: "", output: "", outputType: "text", isRunning: false }]);
    setKernelStatus("loading");
    (async () => {
      try {
        await loadPyodide();
        await installDependencies(project.dependencies);
        setKernelStatus("idle");
      } catch { setKernelStatus("off"); }
    })();
  }, [project]);

  const addCell = () => {
    const c: Cell = { id: newId(), type: "code", content: "", output: "", outputType: "text", isRunning: false };
    setCells((prev) => [...prev, c]);
    setTimeout(() => setActiveCell(c.id), 50);
  };

  const updateCell = (id: string, content: string) => {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, content } : c)));
  };

  const deleteCell = (id: string) => {
    if (cells.length <= 1) return;
    setCells((prev) => prev.filter((c) => c.id !== id));
  };

  const runCell = useCallback(async (id: string) => {
    const cell = cells.find((c) => c.id === id);
    if (!cell || !cell.content.trim()) return;
    setCells((prev) => prev.map((c) => c.id === id ? { ...c, isRunning: true, output: "" } : c));
    setKernelStatus("busy");

    const result = await runPython(cell.content);
    setCells((prev) => prev.map((c) => c.id === id ? { ...c, isRunning: false, output: result.output, outputType: result.type } : c));
    setKernelStatus("idle");

    const vars = await getVariables();
    setVariables(vars);
  }, [cells]);

  useEffect(() => { runRef.current = runCell; }, [runCell]);

  const runAll = async () => { for (const c of cells) { if (c.content.trim()) await runCell(c.id); } };
  const clearAll = () => { setCells([{ id: newId(), type: "code", content: "", output: "", outputType: "text", isRunning: false }]); setVariables([]); };

  const openFile = async (f: ProjectFile) => {
    try {
      const content = await invoke<string>("read_file", { path: f.path });
      const c: Cell = { id: newId(), type: "code", content: `# ${f.name}\n${content}`, output: "", outputType: "text", isRunning: false };
      setCells((prev) => [...prev, c]);
      setActiveCell(c.id);
    } catch { /* */ }
  };

  return (
    <div className="anl-notebook-view">
      {/* Toolbar */}
      <div className="anl-topbar">
        <div className="anl-topbar-left">
          <button className="anl-btn anl-btn--back" onClick={onBack}>←</button>
          <span className="anl-project-name">{project.name}</span>
          <div className="anl-tb-sep" />
          <button className="anl-btn" onClick={addCell}>+ Cell</button>
          <button className="anl-btn anl-btn--green" onClick={runAll}>▶ Run All</button>
          <button className="anl-btn" onClick={clearAll}>Clear</button>
        </div>
        <div className="anl-topbar-right">
          <div className={`anl-kernel anl-kernel--${kernelStatus}`}>
            <span className="anl-kernel-dot" />
            {kernelStatus === "loading" ? "Installing deps..." : kernelStatus === "idle" ? "Python 3 Ready" : kernelStatus === "busy" ? "Running..." : "Disconnected"}
          </div>
        </div>
      </div>

      <div className="anl-body">
        {/* Left — Project files */}
        <ProjectSidebar project={project} onFileOpen={openFile} />

        {/* Center — Notebook */}
        <div className="anl-notebook">
          {cells.map((cell, idx) => (
            <NotebookCell
              key={cell.id}
              cell={cell}
              index={idx}
              isActive={activeCell === cell.id}
              themeId={themeId}
              kernelBusy={kernelStatus === "loading"}
              onRun={runCell}
              onUpdate={updateCell}
              onDelete={deleteCell}
              onClick={setActiveCell}
              runRef={runRef}
            />
          ))}
          <button className="anl-add" onClick={addCell}>+ Add Cell</button>
        </div>

        {/* Right — Variables & Packages */}
        <RightPanel
          variables={variables}
          dependencies={project.dependencies}
          kernelIdle={kernelStatus === "idle"}
          onInstallStart={() => setKernelStatus("busy")}
          onInstallEnd={() => setKernelStatus("idle")}
        />
      </div>
    </div>
  );
}

export default function AnalyticsView() {
  const [currentProject, setCurrentProject] = useState<AnalyticsProject | null>(null);
  const [recentProjects, setRecentProjects] = useState<AnalyticsProject[]>([]);

  const handleCreate = (project: AnalyticsProject) => {
    setCurrentProject(project);
    setRecentProjects((prev) => [project, ...prev.filter((p) => p.name !== project.name)].slice(0, 5));
  };

  if (!currentProject) {
    return <WelcomeScreen onCreateProject={handleCreate} onOpenProject={setCurrentProject} recentProjects={recentProjects} />;
  }

  return <NotebookView project={currentProject} onBack={() => setCurrentProject(null)} />;
}
