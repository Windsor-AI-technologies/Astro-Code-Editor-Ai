import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AnalyticsProject } from "../types";

interface WelcomeScreenProps {
  onCreateProject: (project: AnalyticsProject) => void;
  onOpenProject: (project: AnalyticsProject) => void;
  recentProjects: AnalyticsProject[];
}

export default function WelcomeScreen({ onCreateProject, onOpenProject, recentProjects }: WelcomeScreenProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [kernel, setKernel] = useState<"python" | "r" | "julia">("python");
  const [deps, setDeps] = useState("numpy, pandas, matplotlib");

  const selectFolder = async () => {
    try {
      const selected = await invoke<string | null>("open_folder_dialog");
      if (selected) setProjectPath(selected);
    } catch { /* */ }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const fullPath = projectPath ? `${projectPath}/${name.trim()}` : name.trim();
    const project: AnalyticsProject = {
      name: name.trim(),
      path: fullPath,
      kernel,
      dependencies: deps.split(",").map((d) => d.trim()).filter(Boolean),
      createdAt: Date.now(),
    };
    if (projectPath) {
      try {
        await invoke("create_dir", { path: fullPath });
        await invoke("write_file", { path: `${fullPath}/main.py`, content: `# ${name} - Astro Analytics\n\nimport numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\nprint("Project ready!")\n` });
        await invoke("write_file", { path: `${fullPath}/requirements.txt`, content: project.dependencies.join("\n") + "\n" });
      } catch { /* folder might exist */ }
    }
    onCreateProject(project);
  };

  const handleOpen = async () => {
    try {
      const selected = await invoke<string | null>("open_folder_dialog");
      if (selected) {
        const folderName = selected.split(/[\\/]/).pop() || "Project";
        onOpenProject({ name: folderName, path: selected, kernel: "python", dependencies: ["numpy", "pandas", "matplotlib"], createdAt: Date.now() });
      }
    } catch { /* */ }
  };

  return (
    <div className="anl-welcome">
      <div className="anl-welcome-content">
        <div className="anl-welcome-header">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="4" width="40" height="40" rx="10" stroke="var(--accent)" strokeWidth="2.5" fill="color-mix(in srgb, var(--accent) 8%, transparent)"/>
            <path d="M14 34V20l6 8 6-12 6 10v8" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="14" cy="20" r="2" fill="var(--accent)"/><circle cx="20" cy="28" r="2" fill="var(--accent)"/>
            <circle cx="26" cy="16" r="2" fill="var(--accent)"/><circle cx="32" cy="26" r="2" fill="var(--accent)"/>
          </svg>
          <h1>Astro Analytics</h1>
          <p>Data analysis, notebooks & visualization</p>
        </div>

        {!showCreate ? (
          <div className="anl-welcome-actions">
            <button className="anl-welcome-btn anl-welcome-btn--primary" onClick={() => setShowCreate(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              New Project
            </button>
            <button className="anl-welcome-btn" onClick={handleOpen}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2"/></svg>
              Open Project
            </button>
          </div>
        ) : (
          <div className="anl-create-form">
            <div className="anl-form-field">
              <label>Project Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="my_analysis" autoFocus className="anl-form-input" />
            </div>
            <div className="anl-form-field">
              <label>Location</label>
              <div className="anl-form-path-row">
                <input type="text" value={projectPath} onChange={(e) => setProjectPath(e.target.value)} placeholder="Select folder..." className="anl-form-input" readOnly />
                <button className="anl-form-browse" onClick={selectFolder}>Browse</button>
              </div>
            </div>
            <div className="anl-form-field">
              <label>Kernel</label>
              <select value={kernel} onChange={(e) => setKernel(e.target.value as any)} className="anl-form-select">
                <option value="python">Python 3 (Pyodide)</option>
                <option value="r">R (coming soon)</option>
                <option value="julia">Julia (coming soon)</option>
              </select>
            </div>
            <div className="anl-form-field">
              <label>Dependencies</label>
              <input type="text" value={deps} onChange={(e) => setDeps(e.target.value)} placeholder="numpy, pandas, matplotlib" className="anl-form-input" />
              <span className="anl-form-hint">Comma-separated. Auto-installed on project start.</span>
            </div>
            <div className="anl-form-actions">
              <button className="anl-welcome-btn anl-welcome-btn--primary" onClick={handleCreate} disabled={!name.trim()}>Create</button>
              <button className="anl-welcome-btn" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        )}

        {recentProjects.length > 0 && !showCreate && (
          <div className="anl-recent">
            <h3>Recent</h3>
            {recentProjects.map((p, i) => (
              <button key={i} className="anl-recent-item" onClick={() => onOpenProject(p)}>
                <span className="anl-recent-name">{p.name}</span>
                <span className="anl-recent-meta">{p.kernel} · {p.dependencies.length} deps</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
