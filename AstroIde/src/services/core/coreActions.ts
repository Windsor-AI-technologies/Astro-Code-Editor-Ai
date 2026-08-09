import { registerActions } from "./actionRegistry";
import { astro } from "./astro";
/**
 * Registers all core IDE actions.
 * Call once at app startup, passing the action handlers.
 */

export function registerCoreActions(handlers: {
  save: () => void;
  newFile: () => void;
  closeTab: () => void;
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  toggleAI: () => void;
  toggleSettings: () => void;
  openCommandPalette: () => void;
  openFolder: () => void;
  undo: () => void;
  redo: () => void;
  find: () => void;
  formatDocument: () => void;
  showNotification: (msg: string) => void;
}) {
  return registerActions([
    // File
    {
      id: "file.save",
      title: "Guardar",
      category: "Archivo",
      shortcut: "Ctrl+S",
      run: handlers.save,
    },
    {
      id: "file.new",
      title: "Nuevo archivo",
      category: "Archivo",
      shortcut: "Ctrl+N",
      run: handlers.newFile,
    },
    {
      id: "file.closeTab",
      title: "Cerrar pestaña",
      category: "Archivo",
      shortcut: "Ctrl+W",
      run: handlers.closeTab,
    },
    {
      id: "file.openFolder",
      title: "Abrir carpeta",
      category: "Archivo",
      run: handlers.openFolder,
    },

    // Edit
    {
      id: "edit.undo",
      title: "Deshacer",
      category: "Editar",
      shortcut: "Ctrl+Z",
      run: handlers.undo,
    },
    {
      id: "edit.redo",
      title: "Rehacer",
      category: "Editar",
      shortcut: "Ctrl+Y",
      run: handlers.redo,
    },
    {
      id: "edit.find",
      title: "Buscar",
      category: "Editar",
      shortcut: "Ctrl+F",
      run: handlers.find,
    },
    {
      id: "edit.format",
      title: "Formatear documento",
      category: "Editar",
      shortcut: "Shift+Alt+F",
      run: handlers.formatDocument,
    },

    // View
    {
      id: "view.toggleSidebar",
      title: "Toggle sidebar",
      category: "Vista",
      shortcut: "Ctrl+B",
      run: handlers.toggleSidebar,
    },
    {
      id: "view.toggleTerminal",
      title: "Toggle terminal",
      category: "Vista",
      shortcut: "Ctrl+`",
      run: handlers.toggleTerminal,
    },
    {
      id: "view.toggleAI",
      title: "Toggle panel IA",
      category: "Vista",
      shortcut: "Ctrl+Shift+A",
      run: handlers.toggleAI,
    },
    {
      id: "view.settings",
      title: "Configuración",
      category: "Vista",
      shortcut: "Ctrl+,",
      run: handlers.toggleSettings,
    },
    {
      id: "view.commandPalette",
      title: "Paleta de comandos",
      category: "Vista",
      shortcut: "Ctrl+Shift+P",
      run: handlers.openCommandPalette,
    },
    {
      id:"Hello.World",
      title: "My Command",
      run : () => {
        astro.command.show({message: "Hola mundo"})
      }
    }
  ]);
}
