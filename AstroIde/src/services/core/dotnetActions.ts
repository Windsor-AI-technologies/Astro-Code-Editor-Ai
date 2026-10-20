/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { registerActions } from "./actionRegistry";
import { dotnetInfo, dotnetListTemplates, dotnetNew, dotnetRunAction } from "../runner";
import type { DotnetTemplate } from "../runner";
import { showInputBox, showQuickPick } from "../ui/quickPick";
import { openExternal, openFolderDialog } from "../tauri";

const DOTNET_INSTALL_URL = "https://dotnet.microsoft.com/download";

/**
 * Plantillas de respaldo cuando `dotnet new list` no está disponible
 * (SDK ausente o salida no reconocida). Se muestran igualmente para que el
 * usuario descubra qué tipos de proyecto existen.
 */
export const FALLBACK_DOTNET_TEMPLATES: DotnetTemplate[] = [
  { shortName: "console", name: "Console App", language: "[C#],F#,VB", tags: "Common/Console" },
  { shortName: "classlib", name: "Class Library", language: "[C#],F#,VB", tags: "Common/Library" },
  { shortName: "web", name: "ASP.NET Core Empty", language: "[C#],F#", tags: "Web/Empty" },
  { shortName: "webapi", name: "ASP.NET Core Web API", language: "[C#],F#", tags: "Web/Web API/API/Service" },
  { shortName: "webapiaot", name: "ASP.NET Core Web API (native AOT)", language: "[C#]", tags: "Web/Web API/API/Service" },
  { shortName: "mvc", name: "ASP.NET Core Web App (MVC)", language: "[C#],F#", tags: "Web/MVC" },
  { shortName: "webapp", name: "ASP.NET Core Web App (Razor Pages)", language: "[C#]", tags: "Web/MVC/Razor Pages" },
  { shortName: "blazor", name: "Blazor Web App", language: "[C#]", tags: "Web/Blazor/WebAssembly" },
  { shortName: "blazorwasm", name: "Blazor WebAssembly Standalone App", language: "[C#]", tags: "Web/Blazor/WebAssembly/PWA" },
  { shortName: "razorclasslib", name: "Razor Class Library", language: "[C#]", tags: "Web/Razor/Library" },
  { shortName: "grpc", name: "ASP.NET Core gRPC Service", language: "[C#]", tags: "Web/gRPC/API/Service" },
  { shortName: "worker", name: "Worker Service", language: "[C#],F#", tags: "Common/Worker/Web" },
  { shortName: "xunit", name: "xUnit Test Project", language: "[C#],F#,VB", tags: "Test/xUnit" },
  { shortName: "nunit", name: "NUnit Test Project", language: "[C#],F#,VB", tags: "Test/NUnit" },
  { shortName: "mstest", name: "MSTest Test Project", language: "[C#],F#,VB", tags: "Test/MSTest" },
  { shortName: "wpf", name: "WPF Application", language: "[C#],VB", tags: "Common/WPF" },
  { shortName: "winforms", name: "Windows Forms App", language: "[C#],VB", tags: "Common/WinForms" },
  { shortName: "maui", name: ".NET MAUI App", language: "[C#]", tags: "MAUI" },
  { shortName: "sln", name: "Solution File", language: "", tags: "Solution" },
  { shortName: "editorconfig", name: ".editorconfig File", language: "", tags: "Config" },
  { shortName: "gitignore", name: "dotnet gitignore File", language: "", tags: "Config" },
  { shortName: "globaljson", name: "global.json File", language: "", tags: "Config" },
];

interface DotnetActionHandlers {
  showNotification: (message: string, ms?: number) => void;
  getRootPath: () => string | null;
  refreshTree: () => void | Promise<void>;
  openFolder: (path: string) => void | Promise<void>;
  openOutput: () => void;
  openToolchains: () => void;
}

async function loadTemplates(): Promise<DotnetTemplate[]> {
  try {
    const templates = await dotnetListTemplates();
    if (templates.length > 0) return templates;
  } catch {
    // Sin SDK o salida no parseable: se usan las plantillas de respaldo
  }
  return FALLBACK_DOTNET_TEMPLATES;
}

function joinPath(directory: string, name: string): string {
  return `${directory.replace(/[\\/]+$/, "")}/${name}`;
}

/** Registra los comandos de .NET en la paleta (dotnet new, build, test...). */
export function registerDotnetActions(handlers: DotnetActionHandlers) {
  async function createProject() {
    const info = await dotnetInfo();

    if (!info.available) {
      const choice = await showQuickPick({
        title: ".NET: Crear proyecto",
        placeholder: "El SDK de .NET no está instalado",
        items: [
          {
            label: "Abrir Herramientas y SDK",
            description: "Instalar .NET SDK y C# IntelliSense automáticamente",
            value: "toolchains",
          },
          {
            label: "Ver instrucciones de instalación",
            description: "Abrir dotnet.microsoft.com",
            value: "install",
          },
          { label: "Cancelar", value: "cancel" },
        ],
      });
      if (choice?.value === "toolchains") handlers.openToolchains();
      if (choice?.value === "install") await openExternal(DOTNET_INSTALL_URL);
      return;
    }

    const templates = await loadTemplates();
    const selection = await showQuickPick({
      title: `.NET: Crear proyecto (SDK ${info.version})`,
      placeholder: "Selecciona el tipo de proyecto...",
      items: templates.map(template => ({
        label: template.name,
        description: template.shortName,
        detail: template.tags,
        value: template.shortName,
      })),
    });
    if (!selection) return;

    const name = await showInputBox({
      title: `.NET: Crear proyecto · ${selection.label}`,
      prompt: "Nombre del proyecto (letras, números, '.', '-' y '_')",
      placeholder: "MiProyecto",
      validate: value => {
        if (!value.trim()) return "El nombre es obligatorio";
        if (!/^[A-Za-z0-9._-]+$/.test(value.trim())) {
          return "Solo se permiten letras, números, '.', '-' y '_'";
        }
        return null;
      },
    });
    if (!name) return;

    let destination = handlers.getRootPath();
    if (!destination) {
      destination = await openFolderDialog();
      if (!destination) {
        handlers.showNotification("Selecciona una carpeta para crear el proyecto");
        return;
      }
    }

    const outputDir = joinPath(destination, name);
    try {
      await dotnetNew(selection.value ?? selection.label, name, outputDir);
      handlers.showNotification(`Proyecto "${name}" creado correctamente`);
      await handlers.refreshTree();

      const next = await showQuickPick({
        title: `Proyecto "${name}" creado`,
        items: [
          { label: "Abrir proyecto", description: outputDir, value: "open" },
          { label: "Mantener la carpeta actual", value: "stay" },
        ],
      });
      if (next?.value === "open") await handlers.openFolder(outputDir);
    } catch (error) {
      handlers.showNotification(String(error), 6000);
    }
  }

  function runDotnetAction(action: string, label: string) {
    const rootPath = handlers.getRootPath();
    if (!rootPath) {
      handlers.showNotification(`Abre la carpeta del proyecto para ${label.toLowerCase()}`);
      return;
    }
    handlers.openOutput();
    dotnetRunAction(action, rootPath).catch(error => {
      handlers.showNotification(String(error), 6000);
    });
  }

  async function installCsharpSupport() {
    handlers.openToolchains();
    handlers.showNotification(
      "Instala .NET SDK y C# IntelliSense desde Herramientas y SDK",
      5000,
    );
  }

  function openToolchains() {
    handlers.openToolchains();
  }

  return registerActions([
    {
      id: "dotnet.createProject",
      title: "Crear proyecto...",
      category: ".NET",
      run: createProject,
    },
    {
      id: "dotnet.buildProject",
      title: "Compilar proyecto",
      category: ".NET",
      run: () => runDotnetAction("build", "compilar"),
    },
    {
      id: "dotnet.runProject",
      title: "Ejecutar proyecto",
      category: ".NET",
      run: () => runDotnetAction("run", "ejecutar"),
    },
    {
      id: "dotnet.testProject",
      title: "Ejecutar pruebas",
      category: ".NET",
      run: () => runDotnetAction("test", "probar"),
    },
    {
      id: "dotnet.restoreProject",
      title: "Restaurar dependencias",
      category: ".NET",
      run: () => runDotnetAction("restore", "restaurar"),
    },
    {
      id: "dotnet.installCsharpLs",
      title: "Instalar soporte de C# (IntelliSense)",
      category: ".NET",
      run: installCsharpSupport,
    },
    {
      id: "toolchains.open",
      title: "Instalar compiladores y SDK...",
      category: "Herramientas",
      run: openToolchains,
    },
  ]);
}
