
import type { AppSettings } from "../../../types";
import { THEMES} from "../../../themes";

export type SettingsMode = "ui" | "json";

export interface SettingRow {
  key: keyof AppSettings;
  label: string;
  description: string;
  type: "number" | "boolean" | "select" | "text" | "range";
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  group: string;
}

export const SETTING_ROWS: SettingRow[] = [
  // Editor
  {
    key: "editor.fontSize",
    label: "Tamaño de fuente",
    description: "Tamaño en píxeles del texto del editor",
    type: "number",
    min: 10,
    max: 32,
    group: "Editor",
  },
  {
    key: "editor.tabSize",
    label: "Tamaño de tabulación",
    description: "Número de espacios por tabulación",
    type: "select",
    options: ["2", "4", "8"],
    group: "Editor",
  },
  {
    key: "editor.wordWrap",
    label: "Ajuste de línea",
    description: "Controla cómo se ajustan las líneas largas",
    type: "select",
    options: ["off", "on", "wordWrapColumn", "bounded"],
    group: "Editor",
  },
  {
    key: "editor.minimap",
    label: "Minimap",
    description: "Mostrar mapa de código en miniatura",
    type: "boolean",
    group: "Editor",
  },
  {
    key: "editor.lineNumbers",
    label: "Números de línea",
    description: "Mostrar números de línea en el editor",
    type: "select",
    options: ["on", "off", "relative"],
    group: "Editor",
  },
  {
    key: "editor.fontFamily",
    label: "Familia de fuente",
    description: "Fuente monoespaciada del editor",
    type: "text",
    group: "Editor",
  },
  {
    key: "editor.lineHeight",
    label: "LineHeight",
    description: "Controlar el espaciado del editor",
    type: "number",
    group: "Editor",
    min: 14,
    max:40,
  },
  {
    key: "editor.fontLigatures",
    label: "Ligaduras",
    description: "Activa ligaduras tipográficas",
    type: "boolean",
    group: "Editor",
  },
  {
    key: "editor.formatOnSave",
    label: "Formatear al guardar",
    description: "Formatea el archivo automáticamente al guardar",
    type: "boolean",
    group: "Editor",
  },
  {
    key: "editor.cursorStyle",
    label: "Estilo del cursor",
    description: "Forma del cursor en el editor",
    type: "select",
    options: ["line", "block", "underline"],
    group: "Editor",
  },
  {
    key: "editor.renderWhitespace",
    label: "Mostrar espacios en blanco",
    description: "Visualizar caracteres de espacio y tabulación",
    type: "select",
    options: ["none", "boundary", "selection", "all"],
    group: "Editor",
  },

  // Workbench
  {
    key: "workbench.sidebarWidth",
    label: "Ancho del sidebar",
    description: "Ancho en píxeles del panel lateral",
    type: "range",
    min: 140,
    max: 500,
    step: 10,
    group: "Workbench",
  },
  {
    key: "workbench.sidebarPosition",
    label: "Posición del sidebar",
    description: "Lado donde aparece el explorador de archivos",
    type: "select",
    options: ["left", "right", "top"],
    group: "Workbench",
  },
  {
    key: "workbench.acrylic",
    label: "Efecto acrílico",
    description: "Activa el fondo translúcido con blur en el sidebar",
    type: "boolean",
    group: "Workbench",
  },
  {
    key: "workbench.acrylicOpacity",
    label: "Opacidad acrílica",
    description:
      "Qué tan transparente es el sidebar (0 = invisible, 1 = opaco)",
    type: "range",
    min: 0.1,
    max: 0.9,
    step: 0.05,
    group: "Workbench",
  },
  {
    key: "workbench.colorTheme",
    label: "Tema",
    description: "Tema de colores de la interfaz y el editor",
    type: "select",
    options: THEMES.map((t) => t.id),
    group: "Workbench",
  },
  {
    key: "workbench.nativeFrame",
    label: "Frame nativo",
    description:
      "Usa la barra de título del sistema operativo (requiere reiniciar)",
    type: "boolean",
    group: "Workbench",
  },
  {
    key: "workbench.aiPanelPosition",
    label: "Panel IA (Astro)",
    description: "Lado donde aparece el panel de Astro Black Hole",
    type: "select",
    options: ["left", "right"],
    group: "Workbench",
  },
  {
    key: "workbench.aiPanelWidth",
    label: "Ancho panel IA",
    description: "Ancho en píxeles del panel de IA",
    type: "range",
    min: 250,
    max: 600,
    step: 10,
    group: "Workbench",
  },
  {
    key: "workbench.trafficLightPosition",
    label: "Botones de ventana",
    description:
      "Lado donde aparecen los botones de cerrar/minimizar/maximizar",
    type: "select",
    options: ["left", "right"],
    group: "Workbench",
  },
];