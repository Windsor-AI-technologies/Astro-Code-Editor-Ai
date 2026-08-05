import { useTabsCtx } from '../../../contexts/TabsContext';
import { useSettingsCtx } from '../../../contexts/SettingsContext';
import { useUICtx } from '../../../contexts/UIContext';
import CommandPalette from '../../../components/ui/CommandPalette/CommandPalette';
import EditorCommandPalette from '../../../features/editor/EditorCommandPalette/EditorCommandPalette';

export default function PalettesSlot() {
  const { editorRef } = useTabsCtx();
  const { themeId, updateSetting } = useSettingsCtx();
  const { cmdPaletteOpen, setCmdPaletteOpen, editorCmdPaletteOpen, setEditorCmdPaletteOpen } = useUICtx();

  return (
    <>
      <CommandPalette visible={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)}
        currentTheme={themeId} onThemeChange={(id) => updateSetting('workbench.colorTheme', id)} />
      <EditorCommandPalette visible={editorCmdPaletteOpen}
        onClose={() => setEditorCmdPaletteOpen(false)} editorRef={editorRef} />
    </>
  );
}
