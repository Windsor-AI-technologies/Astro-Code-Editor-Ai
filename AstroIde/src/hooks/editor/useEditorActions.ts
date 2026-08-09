import { useEffect, useCallback } from 'react';
import type * as Monaco from 'monaco-editor';

interface UseEditorActionsOptions {
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  activeTabId: string | null;
  onCursorChange: (pos: { line: number; column: number }) => void;
}

/**
 * Editor actions — undo, redo, find, cursor tracking.
 * SRP: Only editor-instance operations, no file/tab logic.
 */
export function useEditorActions({ editorRef, activeTabId, onCursorChange }: UseEditorActionsOptions) {
  // Track cursor position
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const d = editor.onDidChangeCursorPosition(e => {
      onCursorChange({ line: e.position.lineNumber, column: e.position.column });
    });
    return () => d.dispose();
  }, [activeTabId]);

  const undo = useCallback(() => {
    editorRef.current?.trigger('keyboard', 'undo', null);
  }, [editorRef]);

  const redo = useCallback(() => {
    editorRef.current?.trigger('keyboard', 'redo', null);
  }, [editorRef]);

  const find = useCallback(() => {
    editorRef.current?.getAction('actions.find')?.run();
  }, [editorRef]);

  return { undo, redo, find };
}
