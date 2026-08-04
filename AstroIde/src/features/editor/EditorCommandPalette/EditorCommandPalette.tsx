import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, Terminal } from "lucide-react";
import type * as Monaco from "monaco-editor";
import "./EditorCommandPalette.css";

interface EditorAction {
  id: string;
  label: string;
  keybinding?: string;
}

interface EditorCommandPaletteProps {
  visible: boolean;
  onClose: () => void;
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
}

export default function EditorCommandPalette({
  visible,
  onClose,
  editorRef,
}: EditorCommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [actions, setActions] = useState<EditorAction[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Cerrar al click fuera de la paleta
  useEffect(() => {
    if (!visible) return;
    function handleMouseDown(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [visible, onClose]);

  // Obtener todas las acciones del editor al abrir
  useEffect(() => {
    if (!visible || !editorRef.current) return;
    const editor = editorRef.current;
    const editorActions = editor.getSupportedActions().map((a) => ({
      id: a.id,
      label: a.label || a.id,
      keybinding: undefined,
    }));

    // Acciones custom adicionales
    const customActions: EditorAction[] = [
      {
        id: "editor.action.formatDocument",
        label: "Formatear documento",
        keybinding: "Shift+Alt+F",
      },
      {
        id: "editor.action.commentLine",
        label: "Comentar línea",
        keybinding: "Ctrl+/",
      },
      {
        id: "editor.action.quickOutline",
        label: "Ir a símbolo...",
        keybinding: "Ctrl+Shift+O",
      },
      {
        id: "editor.action.revealDefinition",
        label: "Ir a definición",
        keybinding: "Ctrl+F12",
      },
      {
        id: "editor.action.goToReferences",
        label: "Ir a referencias",
        keybinding: "Shift+F12",
      },
      {
        id: "editor.action.rename",
        label: "Renombrar símbolo",
        keybinding: "F2",
      },
      { id: "actions.find", label: "Buscar", keybinding: "Ctrl+F" },
      {
        id: "editor.action.startFindReplaceAction",
        label: "Buscar y reemplazar",
        keybinding: "Ctrl+H",
      },
      { id: "editor.foldAll", label: "Plegar todo" },
      { id: "editor.unfoldAll", label: "Desplegar todo" },
      { id: "editor.action.indentLines", label: "Indentar líneas" },
      { id: "editor.action.outdentLines", label: "Des-indentar líneas" },
      {
        id: "editor.action.transformToUppercase",
        label: "Convertir a MAYÚSCULAS",
      },
      {
        id: "editor.action.transformToLowercase",
        label: "Convertir a minúsculas",
      },
      {
        id: "editor.action.sortLinesAscending",
        label: "Ordenar líneas ascendente",
      },
      {
        id: "editor.action.sortLinesDescending",
        label: "Ordenar líneas descendente",
      },
      { id: "editor.action.duplicateSelection", label: "Duplicar selección" },
      {
        id: "editor.action.selectAll",
        label: "Seleccionar todo",
        keybinding: "Ctrl+A",
      },
      {
        id: "editor.action.clipboardCopyAction",
        label: "Copiar",
        keybinding: "Ctrl+C",
      },
      {
        id: "editor.action.clipboardCutAction",
        label: "Cortar",
        keybinding: "Ctrl+X",
      },
      {
        id: "editor.action.clipboardPasteAction",
        label: "Pegar",
        keybinding: "Ctrl+V",
      },
      { id: "undo", label: "Deshacer", keybinding: "Ctrl+Z" },
      { id: "redo", label: "Rehacer", keybinding: "Ctrl+Y" },
    ];

    // Merge: custom tiene prioridad por label legible
    const customIds = new Set(customActions.map((a) => a.id));
    const merged = [
      ...customActions,
      ...editorActions.filter((a) => !customIds.has(a.id) && a.label !== a.id),
    ];

    setActions(merged);
    setSearch("");
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [visible]);

  const filtered = actions.filter(
    (a) =>
      a.label.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    const item = listRef.current?.querySelector(
      ".ecp-item.selected",
    ) as HTMLElement;
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function handleRun(action: EditorAction) {
    const editor = editorRef.current;
    if (!editor) return;

    // Acciones especiales
    if (action.id === "undo") {
      editor.trigger("palette", "undo", null);
    } else if (action.id === "redo") {
      editor.trigger("palette", "redo", null);
    } else {
      editor.getAction(action.id)?.run();
    }

    editor.focus();
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && filtered[selectedIndex]) {
      handleRun(filtered[selectedIndex]);
    }
  }

  if (!visible) return null;

  return createPortal(
    <div className="ecp-overlay">
      <div className="ecp-palette" ref={paletteRef} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <div className="ecp-input-wrap">
          <Search size={14} className="ecp-input-icon" />
          <input
            ref={inputRef}
            className="ecp-input"
            placeholder="Buscar comando..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="ecp-input-badge">
            <Terminal size={12} />
          </div>
        </div>

        <div className="ecp-list" ref={listRef}>
          {filtered.map((action, idx) => (
            <button
              key={action.id}
              className={`ecp-item ${idx === selectedIndex ? "selected" : ""}`}
              onClick={() => handleRun(action)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <span className="ecp-label">{action.label}</span>
              {action.keybinding && (
                <span className="ecp-shortcut">{action.keybinding}</span>
              )}
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="ecp-empty">No se encontraron comandos</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
