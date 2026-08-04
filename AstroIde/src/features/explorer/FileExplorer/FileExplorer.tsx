import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  FilePlus, FolderPlus, Trash2, Edit2
} from 'lucide-react';
import type { FileEntry } from '../../../types';
import { getFileIcon, getFolderIcon } from '../../../utils/file-icons';
import './FileExplorer.css';

interface FileExplorerProps {
  rootPath: string | null;
  tree: FileEntry[];
  onFileSelect: (path: string) => void;
  onTreeChange: () => void;
  activeFilePath: string | null;
  iconTheme?: 'material' | 'none';
}

interface TreeNodeProps {
  entry: FileEntry;
  depth: number;
  onFileSelect: (path: string) => void;
  onTreeChange: () => void;
  activeFilePath: string | null;
  iconTheme: 'material' | 'none';
  selectedFolder: string | null;
  onSelectFolder: (path: string | null) => void;
  refreshCounter: number;
  onDraggedOver: (path: string | null) => void;
  dragTarget: string | null;
}

function TreeNode({
  entry, depth, onFileSelect, onTreeChange, activeFilePath, iconTheme,
  selectedFolder, onSelectFolder, refreshCounter, onDraggedOver, dragTarget
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(entry.name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const isActive = !entry.is_dir && activeFilePath === entry.path;
  const isSelectedFolder = entry.is_dir && selectedFolder === entry.path;
  const isDragTarget = entry.is_dir && dragTarget === entry.path;

  const loadChildren = useCallback(async () => {
    if (!entry.is_dir) return;
    setLoading(true);
    try {
      const entries = await invoke<FileEntry[]>('read_dir', { path: entry.path });
      setChildren(entries);
    } catch {
      setChildren([]);
    }
    setLoading(false);
  }, [entry.path, entry.is_dir]);

  // Recargar cuando refreshCounter cambia y está expandida
  useEffect(() => {
    if (expanded && entry.is_dir) {
      loadChildren();
    }
  }, [refreshCounter]);

  async function handleClick() {
    if (entry.is_dir) {
      const willExpand = !expanded;
      setExpanded(willExpand);
      onSelectFolder(entry.path);
      if (willExpand) await loadChildren();
    } else {
      onFileSelect(entry.path);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${entry.name}"?`)) return;
    await invoke('delete_path', { path: entry.path });
    onTreeChange();
    setContextMenu(null);
  }

  async function handleRename() {
    if (newName && newName !== entry.name) {
      const parts = entry.path.split(/[\\/]/);
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');
      await invoke('rename_path', { oldPath: entry.path, newPath });
      onTreeChange();
    }
    setRenaming(false);
    setContextMenu(null);
  }

  async function handleNewFile(e: React.MouseEvent) {
    e.stopPropagation();
    const name = prompt('Nombre del archivo:');
    if (!name) return;
    const base = entry.is_dir ? entry.path : entry.path.replace(/[\\/][^\\/]+$/, '');
    await invoke('create_file', { path: `${base}/${name}` });
    if (entry.is_dir) { setExpanded(true); await loadChildren(); }
    onTreeChange();
    setContextMenu(null);
  }

  async function handleNewFolder(e: React.MouseEvent) {
    e.stopPropagation();
    const name = prompt('Nombre de la carpeta:');
    if (!name) return;
    const base = entry.is_dir ? entry.path : entry.path.replace(/[\\/][^\\/]+$/, '');
    await invoke('create_dir', { path: `${base}/${name}` });
    if (entry.is_dir) { setExpanded(true); await loadChildren(); }
    onTreeChange();
    setContextMenu(null);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/astro-path', entry.path);
    e.dataTransfer.effectAllowed = 'move';
    // Ghost image semi-transparente
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, 10, 10);
  }

  function handleDragOver(e: React.DragEvent) {
    if (!entry.is_dir) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    onDraggedOver(entry.path);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    onDraggedOver(null);

    if (!entry.is_dir) return;

    const sourcePath = e.dataTransfer.getData('application/astro-path');
    if (!sourcePath || sourcePath === entry.path) return;

    try {
      await invoke('move_path', { source: sourcePath, destFolder: entry.path });
      setExpanded(true);
      await loadChildren();
      onTreeChange();
    } catch (err) {
      // Silencioso — el backend ya valida
    }
  }

  const indent = depth * 12;

  return (
    <div className="tree-node-wrapper">
      {contextMenu && (
        <>
          <div className="ctx-overlay" onClick={() => setContextMenu(null)} />
          <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
            {entry.is_dir && (
              <>
                <button onClick={handleNewFile}><FilePlus size={13} /> Nuevo archivo</button>
                <button onClick={handleNewFolder}><FolderPlus size={13} /> Nueva carpeta</button>
                <div className="ctx-sep" />
              </>
            )}
            <button onClick={() => { setRenaming(true); setNewName(entry.name); setContextMenu(null); }}>
              <Edit2 size={13} /> Renombrar
            </button>
            <button className="danger" onClick={handleDelete}>
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        </>
      )}

      <div
        className={`tree-node ${isActive ? 'active' : ''} ${entry.is_dir ? 'is-dir' : ''} ${isSelectedFolder ? 'selected-folder' : ''} ${isDragTarget ? 'drag-over' : ''}`}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={entry.path}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {entry.is_dir ? (
          <>
            <span className="tree-arrow">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <span className="tree-icon dir">
              {iconTheme === 'material' ? (() => {
                const folder = getFolderIcon(entry.name);
                const Icon = expanded ? folder.open : folder.closed;
                return <Icon size={16} />;
              })() : (expanded ? <FolderOpen size={14} /> : <Folder size={14} />)}
            </span>
          </>
        ) : (
          <>
            <span className="tree-arrow" />
            <span className="tree-icon file">
              {iconTheme === 'material' ? (() => {
                const Icon = getFileIcon(entry.name);
                return <Icon size={16} />;
              })() : <File size={14} />}
            </span>
          </>
        )}

        {renaming ? (
          <input
            className="rename-input"
            value={newName}
            autoFocus
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="tree-name">{entry.name}</span>
        )}
      </div>

      {entry.is_dir && expanded && (
        <div
          className="tree-children"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {loading && <div className="tree-empty" style={{ paddingLeft: `${indent + 28}px` }}>...</div>}
          {!loading && children && children.length === 0 && (
            <div className="tree-empty" style={{ paddingLeft: `${indent + 28}px` }}>vacío</div>
          )}
          {!loading && children && children.map(child => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              onTreeChange={onTreeChange}
              activeFilePath={activeFilePath}
              iconTheme={iconTheme}
              selectedFolder={selectedFolder}
              onSelectFolder={onSelectFolder}
              refreshCounter={refreshCounter}
              onDraggedOver={onDraggedOver}
              dragTarget={dragTarget}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({
  rootPath, tree, onFileSelect, onTreeChange, activeFilePath, iconTheme = 'material'
}: FileExplorerProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  function triggerRefresh() {
    setRefreshCounter(c => c + 1);
    onTreeChange();
  }

  async function handleNewRootFile() {
    if (!rootPath) return;
    const name = prompt('Nombre del archivo:');
    if (!name) return;
    const base = selectedFolder ?? rootPath;
    await invoke('create_file', { path: `${base}/${name}` });
    triggerRefresh();
  }

  async function handleNewRootFolder() {
    if (!rootPath) return;
    const name = prompt('Nombre de la carpeta:');
    if (!name) return;
    const base = selectedFolder ?? rootPath;
    await invoke('create_dir', { path: `${base}/${name}` });
    triggerRefresh();
  }

  // Drop en la raíz del explorador (mover a raíz)
  function handleRootDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragTarget('__root__');
  }

  function handleRootDragLeave() {
    setDragTarget(null);
  }

  async function handleRootDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragTarget(null);
    if (!rootPath) return;
    const sourcePath = e.dataTransfer.getData('application/astro-path');
    if (!sourcePath) return;
    try {
      await invoke('move_path', { source: sourcePath, destFolder: rootPath });
      triggerRefresh();
    } catch { /* silencioso */ }
  }

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <span className="explorer-title">
          {rootPath ? rootPath.split(/[\\/]/).pop() : 'EXPLORADOR'}
        </span>
        {rootPath && (
          <div className="explorer-actions">
            <button title="Nuevo archivo" onClick={handleNewRootFile}><FilePlus size={14} /></button>
            <button title="Nueva carpeta" onClick={handleNewRootFolder}><FolderPlus size={14} /></button>
          </div>
        )}
      </div>

      <div
        className={`explorer-tree ${dragTarget === '__root__' ? 'drag-over-root' : ''}`}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {tree.length === 0 ? (
          <div className="explorer-empty">
            {rootPath ? 'Carpeta vacía' : 'Abre una carpeta para comenzar'}
          </div>
        ) : (
          tree.map(entry => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              onFileSelect={onFileSelect}
              onTreeChange={triggerRefresh}
              activeFilePath={activeFilePath}
              iconTheme={iconTheme}
              selectedFolder={selectedFolder}
              onSelectFolder={setSelectedFolder}
              refreshCounter={refreshCounter}
              onDraggedOver={setDragTarget}
              dragTarget={dragTarget}
            />
          ))
        )}
      </div>
    </div>
  );
}
