import { useState, useRef, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { Minus, Square, X } from "lucide-react";
import "./TitleBar.css";
import { useUICtx } from "../../../contexts/UIContext";

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
}

interface TitleBarProps {
  title?: string;
  onOpenFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onSave: () => void;
  onNewFile: () => void;
  canSave: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFind: () => void;
  onOpenSettings: () => void;
  onToggleTerminal: () => void;
  onToggleAI: () => void;
  trafficLightPosition?: "left" | "right";
  onOpenCommandPalette?: () => void;
  editorCommandPallete?: () => void;
}

export default function TitleBar({
  title,
  onOpenFolder,
  onOpenFile,
  onSave,
  onNewFile,
  canSave,
  onUndo,
  onRedo,
  onFind,
  onOpenSettings,
  onToggleTerminal,
  onToggleAI,
  trafficLightPosition = "left",
  onOpenCommandPalette,
}: TitleBarProps) {
  
  const appWindow = getCurrentWindow();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  async function handleMinimize() {
    await appWindow.minimize();
  }
  async function handleMaximize() {
    if (await appWindow.isMaximized()) await appWindow.unmaximize();
    else await appWindow.maximize();
  }
  async function handleClose() {
    await appWindow.close();
  }

  async function handleOpenFolder() {
    const path = await invoke<string | null>("open_folder_dialog");
    if (path) onOpenFolder(path);
    setOpenMenu(null);
  }
  async function handleOpenFile() {
    const path = await invoke<string | null>("open_file_dialog");
    if (path) onOpenFile(path);
    setOpenMenu(null);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpenMenu(null);
    }
    if (openMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu]);

  const { setCmdPaletteOpen } = useUICtx();

  const menus: Record<string, MenuItem[]> = {
    File: [
      {
        label: "Nuevo archivo",
        shortcut: "Ctrl+N",
        action: () => {
          onNewFile();
          setOpenMenu(null);
        },
      },
      { label: "Abrir archivo...", shortcut: "Ctrl+O", action: handleOpenFile },
      {
        label: "Abrir carpeta...",
        shortcut: "Ctrl+Shift+O",
        action: handleOpenFolder,
      },
      { divider: true, label: "" },
      {
        label: "Guardar",
        shortcut: "Ctrl+S",
        action: () => {
          onSave();
          setOpenMenu(null);
        },
        disabled: !canSave,
      },
      { divider: true, label: "" },
      {
        label: "Configuración",
        shortcut: "Ctrl+,",
        action: () => {
          onOpenSettings();
          setOpenMenu(null);
        },
      },
      {
        label: "Temas",
        action: () => {
          setCmdPaletteOpen(true);
        },
      },
    ],
    Edit: [
      {
        label: "Deshacer",
        shortcut: "Ctrl+Z",
        action: () => {
          onUndo();
          setOpenMenu(null);
        },
      },
      {
        label: "Rehacer",
        shortcut: "Ctrl+Y",
        action: () => {
          onRedo();
          setOpenMenu(null);
        },
      },
      { divider: true, label: "" },
      {
        label: "Buscar",
        shortcut: "Ctrl+F",
        action: () => {
          onFind();
          setOpenMenu(null);
        },
      },
    ],
    Selection: [
      {
        label: "Seleccionar todo",
        shortcut: "Ctrl+A",
        action: () => setOpenMenu(null),
      },
    ],
    View: [
      {
        label: "Panel de IA",
        shortcut: "Ctrl+Shift+A",
        action: () => {
          onToggleAI();
          setOpenMenu(null);
        },
      },
      {
        label: "Terminal",
        shortcut: "Ctrl+`",
        action: () => {
          onToggleTerminal();
          setOpenMenu(null);
        },
      },
      { divider: true, label: "" },
      {
        label: "Configuración",
        shortcut: "Ctrl+,",
        action: () => {
          onOpenSettings();
          setOpenMenu(null);
        },
      },
    ],
    Terminal: [
      {
        label: "Nueva terminal",
        shortcut: "Ctrl+`",
        action: () => {
          onToggleTerminal();
          setOpenMenu(null);
        },
      },
    ],
    Help: [
      {
        label: "Acerca de Astro Editor",
        action: () => {
          alert("Astro Editor v0.1.0");
          setOpenMenu(null);
        },
      },
    ],
  };

  const trafficLights = (
    <div className="titlebar-buttons macos-buttons">
      <button
        className="traffic-light traffic-close"
        onClick={handleClose}
        title="Cerrar"
      >
        <X size={8} />
      </button>
      <button
        className="traffic-light traffic-minimize"
        onClick={handleMinimize}
        title="Minimizar"
      >
        <Minus size={8} />
      </button>
      <button
        className="traffic-light traffic-maximize"
        onClick={handleMaximize}
        title="Maximizar"
      >
        <Square size={6} />
      </button>
    </div>
  );

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left" ref={menuRef}>
        {trafficLightPosition === "left" && trafficLights}
        <svg
          className="titlebar-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" fill="url(#universe-grad)" />
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="4"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.8"
            fill="none"
          />
          <ellipse
            cx="12"
            cy="12"
            rx="7"
            ry="9"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="0.6"
            fill="none"
            transform="rotate(30 12 12)"
          />
          <circle cx="8" cy="9" r="0.8" fill="#fff" opacity="0.9" />
          <circle cx="15" cy="7" r="0.5" fill="#fff" opacity="0.7" />
          <circle cx="16" cy="14" r="0.6" fill="#fff" opacity="0.8" />
          <circle cx="6" cy="15" r="0.4" fill="#fff" opacity="0.6" />
          <circle cx="12" cy="5" r="0.5" fill="#fff" opacity="0.7" />
          <circle cx="10" cy="17" r="0.4" fill="#fff" opacity="0.5" />
          <circle cx="18" cy="10" r="0.3" fill="#fff" opacity="0.6" />
          <circle cx="12" cy="12" r="1.5" fill="#fff" opacity="0.9" />
          <defs>
            <radialGradient id="universe-grad" cx="0.4" cy="0.4" r="0.7">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#3b0764" />
              <stop offset="100%" stopColor="#0f0326" />
            </radialGradient>
          </defs>
        </svg>
        {Object.keys(menus).map((key) => (
          <div key={key} className="menu-item-wrapper">
            <button
              className={`menu-item ${openMenu === key ? "active" : ""}`}
              onClick={() => setOpenMenu(openMenu === key ? null : key)}
              onMouseEnter={() => {
                if (openMenu) setOpenMenu(key);
              }}
            >
              {key}
            </button>
            {openMenu === key && (
              <div className="menu-dropdown">
                {menus[key].map((item, i) =>
                  item.divider ? (
                    <div key={i} className="menu-divider" />
                  ) : (
                    <button
                      key={i}
                      className={`menu-dropdown-item ${item.disabled ? "disabled" : ""}`}
                      onClick={item.action}
                      disabled={item.disabled}
                    >
                      <span className="menu-dropdown-label">{item.label}</span>
                      {item.shortcut && (
                        <span className="menu-dropdown-shortcut">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="titlebar-center"
        onClick={onOpenCommandPalette}
        title="Buscar comandos (Ctrl+K T)"
      >
        {title || "Astro Editor"}
      </div>

      <div className="titlebar-right">
        {trafficLightPosition === "right" && trafficLights}
      </div>
    </div>
  );
}
