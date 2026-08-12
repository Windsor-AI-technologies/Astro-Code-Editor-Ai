import MonacoEditor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import { registerAllMonacoThemes } from "../../../themes";
import type { Cell } from "../types";

interface NotebookCellProps {
  cell: Cell;
  index: number;
  isActive: boolean;
  themeId: string;
  kernelBusy: boolean;
  onRun: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
  runRef: React.MutableRefObject<((id: string) => void) | undefined>;
}

export default function NotebookCell({ cell, index, isActive, themeId, kernelBusy, onRun, onUpdate, onDelete, onClick, runRef }: NotebookCellProps) {
  const handleBeforeMount: BeforeMount = (monaco) => { registerAllMonacoThemes(monaco); };

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => { runRef.current?.(cell.id); });
    editor.addCommand(monaco.KeyCode.Space, () => { editor.trigger('keyboard', 'type', { text: ' ' }); });
    setTimeout(() => editor.focus(), 100);
  };

  return (
    <div className={`anl-cell ${isActive ? "anl-cell--focus" : ""}`} onClick={() => onClick(cell.id)}>
      {/* Gutter */}
      <div className="anl-cell-gutter">
        <button className="anl-cell-play" onClick={(e) => { e.stopPropagation(); onRun(cell.id); }} disabled={kernelBusy}>
          {cell.isRunning ? <div className="anl-cell-spinner" /> : <svg width="14" height="14" viewBox="0 0 16 16"><polygon points="4,2 14,8 4,14" fill="currentColor"/></svg>}
        </button>
        <span className="anl-cell-num">{index + 1}</span>
      </div>

      {/* Content */}
      <div className="anl-cell-content">
        <button className="anl-cell-del" onClick={(e) => { e.stopPropagation(); onDelete(cell.id); }}>✕</button>

        <div className="anl-cell-editor">
          <MonacoEditor
            height={Math.max(80, Math.min(300, (cell.content.split("\n").length + 1) * 19))}
            language="python"
            value={cell.content}
            onChange={(v) => onUpdate(cell.id, v || "")}
            theme={themeId}
            beforeMount={handleBeforeMount}
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              lineNumbersMinChars: 3,
              folding: false,
              glyphMargin: false,
              renderLineHighlight: "line",
              overviewRulerBorder: false,
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              scrollbar: { vertical: "hidden", horizontal: "auto", verticalScrollbarSize: 0 },
              wordWrap: "on",
              fontSize: 13,
              fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
              padding: { top: 8, bottom: 8 },
              automaticLayout: true,
              tabSize: 4,
              contextmenu: false,
            }}
          />
        </div>

        {/* Output */}
        {cell.output && (
          <div className={`anl-cell-out ${cell.outputType === "error" ? "anl-cell-out--err" : ""}`}>
            {cell.outputType === "image" ? (
              <img src={`data:image/png;base64,${cell.output}`} alt="plot" className="anl-cell-img" />
            ) : (
              <pre>{cell.output}</pre>
            )}
          </div>
        )}

        {cell.isRunning && <div className="anl-cell-running"><div className="anl-cell-spinner" /> Running...</div>}
      </div>
    </div>
  );
}
