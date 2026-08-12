// ══════════════════════════════════════════════
// Pyodide Service — Python runtime in WebAssembly
// ══════════════════════════════════════════════

let pyodideInstance: any = null;
let pyodideLoading = false;
let pyodideReady = false;

const BUILTIN_PACKAGES = [
  "numpy", "pandas", "matplotlib", "scipy", "scikit-learn",
  "sympy", "networkx", "pillow", "openpyxl", "seaborn",
];

export async function loadPyodide(): Promise<any> {
  if (pyodideReady && pyodideInstance) return pyodideInstance;
  if (pyodideLoading) {
    while (!pyodideReady) await new Promise((r) => setTimeout(r, 100));
    return pyodideInstance;
  }
  pyodideLoading = true;

  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
  document.head.appendChild(script);
  await new Promise<void>((resolve) => { script.onload = () => resolve(); });

  pyodideInstance = await (window as any).loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
  });
  await pyodideInstance.loadPackage("micropip");

  pyodideReady = true;
  pyodideLoading = false;
  return pyodideInstance;
}

export function isPyodideReady() { return pyodideReady; }

export async function installDependencies(deps: string[]) {
  const pyodide = await loadPyodide();
  const toLoadBuiltin = deps.filter((d) => BUILTIN_PACKAGES.includes(d.toLowerCase())).map((d) => d.toLowerCase());
  const toLoadPip = deps.filter((d) => !BUILTIN_PACKAGES.includes(d.toLowerCase()));

  if (toLoadBuiltin.length > 0) {
    await pyodide.loadPackage(toLoadBuiltin);
  }
  for (const dep of toLoadPip) {
    try { await pyodide.runPythonAsync(`import micropip; await micropip.install("${dep}")`); } catch { /* */ }
  }
}

export async function installPackage(pkg: string) {
  const pyodide = await loadPyodide();
  if (BUILTIN_PACKAGES.includes(pkg.toLowerCase())) {
    await pyodide.loadPackage(pkg.toLowerCase());
  } else {
    await pyodide.runPythonAsync(`import micropip; await micropip.install("${pkg}")`);
  }
}

export interface RunResult {
  output: string;
  type: "text" | "error" | "image";
}

export async function runPython(code: string): Promise<RunResult> {
  try {
    const pyodide = await loadPyodide();

    // Setup stdout/stderr + patch plt.show
    pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    _astro_has_plot = False
    def _patched_show(*a, **k):
        global _astro_has_plot
        _astro_has_plot = True
    plt.show = _patched_show
except: pass
`);

    let result;
    try { result = pyodide.runPython(code); } catch (e: any) {
      pyodide.runPython("sys.stdout = sys.__stdout__\nsys.stderr = sys.__stderr__");
      return { output: e.message || String(e), type: "error" };
    }

    const stdout = pyodide.runPython("sys.stdout.getvalue()");
    const stderr = pyodide.runPython("sys.stderr.getvalue()");
    pyodide.runPython("sys.stdout = sys.__stdout__\nsys.stderr = sys.__stderr__");

    // Check for plot
    let hasPlot = false;
    try { hasPlot = pyodide.runPython("_astro_has_plot"); } catch { /* */ }

    if (hasPlot) {
      try {
        const imgData = pyodide.runPython(`
import base64
from io import BytesIO
fig = plt.gcf()
fig.set_facecolor('#1a1b26')
for ax in fig.axes:
    ax.set_facecolor('#1a1b26')
    ax.tick_params(colors='#c0caf5')
    ax.xaxis.label.set_color('#c0caf5')
    ax.yaxis.label.set_color('#c0caf5')
    ax.title.set_color('#c0caf5')
    for spine in ax.spines.values():
        spine.set_edgecolor('#414868')
    ax.grid(True, color='#2a2f44', alpha=0.5)
buf = BytesIO()
plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#1a1b26', edgecolor='none')
buf.seek(0)
img_str = base64.b64encode(buf.read()).decode()
plt.close('all')
_astro_has_plot = False
img_str`);
        if (imgData && imgData.length > 100) return { output: imgData, type: "image" };
      } catch { /* fallback to text */ }
    }

    if (stderr && !stderr.includes("UserWarning")) return { output: stderr, type: "error" };

    let output = stdout;
    if (!output && result !== undefined && result !== null && String(result) !== "None") {
      output = String(result);
    }
    return { output: output || "", type: "text" };
  } catch (e: any) { return { output: e.message || String(e), type: "error" }; }
}

export async function getVariables(): Promise<{ name: string; type: string; value: string }[]> {
  try {
    const pyodide = await loadPyodide();
    const varsJson = pyodide.runPython(`
import json
_uv = {}
for _n, _v in list(globals().items()):
    if not _n.startswith('_') and _n not in ('sys','json','StringIO','base64','BytesIO','matplotlib','plt','buf','img_str','micropip','fig','ax'):
        try:
            if not callable(_v): _uv[_n] = {"type": type(_v).__name__, "value": repr(_v)[:40]}
        except: pass
json.dumps(_uv)`);
    const parsed = JSON.parse(varsJson);
    return Object.entries(parsed).map(([n, i]: [string, any]) => ({ name: n, type: i.type, value: i.value }));
  } catch { return []; }
}
