import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  FilePlus, FolderPlus, Trash2, Edit2
} from 'lucide-react';
import type { FileEntry } from '../../types';
import './FileExplorer.css';

interface FileExplorerProps {
  rootPath: string | null;
  tree: FileEntry[];
  onFileSelect: (path: string) => void;
  onTreeChange: () => void;
  activeFilePath: string | null;
}

interface TreeNodeProps {
  entry: FileEntry;
  depth: number;
  onFileSelect: (path: string) => void;
  onTreeChange: () => void;
  activeFilePath: string | null;
}

function TreeNode({ entry, depth, onFileSelect, onTreeChange, activeFilePath }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(entry.name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const isActive = !entry.is_dir && activeFilePath === entry.path;

  function handleClick() {
    if (entry.is_dir) {
      setExpanded(v => !v);
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
    onTreeChange();
    setContextMenu(null);
  }

  async function handleNewFolder(e: React.MouseEvent) {
    e.stopPropagation();
    const name = prompt('Nombre de la carpeta:');
    if (!name) return;
    const base = entry.is_dir ? entry.path : entry.path.replace(/[\\/][^\\/]+$/, '');
    await invoke('create_dir', { path: `${base}/${name}` });
    onTreeChange();
    setContextMenu(null);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
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
        className={`tree-node ${isActive ? 'active' : ''} ${entry.is_dir ? 'is-dir' : ''}`}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={entry.path}
      >
        {entry.is_dir ? (
          <>
            <span className="tree-arrow">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <span className="tree-icon dir">
              {expanded ? <FolderOpen size={14} /> : <Folder size={14} />}
            </span>
          </>
        ) : (
          <>
            <span className="tree-arrow" />
            <span className="tree-icon file"><File size={14} /></span>
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

      {entry.is_dir && expanded && entry.children && (
        <div className="tree-children">
          {entry.children.map(child => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              onTreeChange={onTreeChange}
              activeFilePath={activeFilePath}
            />
          ))}
          {entry.children.length === 0 && (
            <div className="tree-empty" style={{ paddingLeft: `${indent + 28}px` }}>
              vacío
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({
  rootPath, tree, onFileSelect, onTreeChange, activeFilePath
}: FileExplorerProps) {
  async function handleNewRootFile() {
    if (!rootPath) return;
    const name = prompt('Nombre del archivo:');
    if (!name) return;
    await invoke('create_file', { path: `${rootPath}/${name}` });
    onTreeChange();
  }

  async function handleNewRootFolder() {
    if (!rootPath) return;
    const name = prompt('Nombre de la carpeta:');
    if (!name) return;
    await invoke('create_dir', { path: `${rootPath}/${name}` });
    onTreeChange();
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

      <div className="explorer-tree">
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
              onTreeChange={onTreeChange}
              activeFilePath={activeFilePath}
            />
          ))
        )}
      </div>
    </div>
  );
}
