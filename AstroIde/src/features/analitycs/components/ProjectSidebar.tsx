import { useEffect, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AnalyticsProject, ProjectFile } from "../types";

interface ProjectSidebarProps {
  project: AnalyticsProject;
  onFileOpen: (file: ProjectFile) => void;
}

const FILE_ICONS: Record<string, string> = {
  ".csv": "📊", ".xlsx": "📗", ".xls": "📗",
  ".json": "{}", ".py": "🐍", ".ipynb": "📓",
  ".txt": "📄", ".md": "📝", ".parquet": "📦",
};

function getIcon(name: string) {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return FILE_ICONS[ext] || "📄";
}

export default function ProjectSidebar({ project, onFileOpen }: ProjectSidebarProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);

  const refresh = useCallback(async () => {
    if (!project.path) return;
    try {
      const entries = await invoke<any[]>("read_dir", { path: project.path });
      setFiles(entries.filter((e: any) => !e.is_dir).map((e: any) => ({ name: e.name, path: e.path })));
    } catch { /* */ }
  }, [project.path]);

  useEffect(() => { refresh(); }, [refresh]);

  const createFile = async () => {
    const fileName = prompt("File name (e.g. data.csv, analysis.py):");
    if (!fileName) return;
    try {
      await invoke("write_file", { path: `${project.path}/${fileName}`, content: "" });
      refresh();
    } catch { /* */ }
  };

  if (!project.path) return null;

  return (
    <div className="anl-project-sidebar">
      <div className="anl-ps-header">
        <svg width="14" height="14" viewBox="0 0 16 16"><path d="M2 3h4l2 2h6v8H2V3z" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
        <span>{project.name}</span>
      </div>
      <div className="anl-ps-tree">
        {files.map((f) => (
          <button key={f.path} className="anl-ps-file" onClick={() => onFileOpen(f)} title={f.path}>
            <span className="anl-ps-icon">{getIcon(f.name)}</span>
            <span className="anl-ps-name">{f.name}</span>
          </button>
        ))}
        {files.length === 0 && <p className="anl-ps-empty">No files yet</p>}
      </div>
      <div className="anl-ps-actions">
        <button className="anl-ps-action-btn" onClick={createFile} title="New file">+ New</button>
        <button className="anl-ps-action-btn" onClick={refresh} title="Refresh">↻</button>
      </div>
    </div>
  );
}
