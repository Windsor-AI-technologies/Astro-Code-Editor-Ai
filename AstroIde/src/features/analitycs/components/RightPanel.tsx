import { useState } from "react";
import type { Variable } from "../types";
import { installPackage as installPkg } from "../services/pyodide";

interface RightPanelProps {
  variables: Variable[];
  dependencies: string[];
  kernelIdle: boolean;
  onInstallStart: () => void;
  onInstallEnd: () => void;
}

export default function RightPanel({ variables, dependencies, kernelIdle, onInstallStart, onInstallEnd }: RightPanelProps) {
  const [tab, setTab] = useState<"variables" | "packages">("variables");
  const [packageInput, setPackageInput] = useState("");

  const handleInstall = async () => {
    if (!packageInput.trim()) return;
    onInstallStart();
    try { await installPkg(packageInput.trim()); } catch { /* */ }
    setPackageInput("");
    onInstallEnd();
  };

  return (
    <div className="anl-side">
      <div className="anl-side-tabs">
        <button className={tab === "variables" ? "active" : ""} onClick={() => setTab("variables")}>Variables</button>
        <button className={tab === "packages" ? "active" : ""} onClick={() => setTab("packages")}>Packages</button>
      </div>
      <div className="anl-side-body">
        {tab === "variables" && (
          variables.length === 0
            ? <p className="anl-side-empty">Run a cell to see variables</p>
            : <div className="anl-vars">
                {variables.map((v) => (
                  <div key={v.name} className="anl-var">
                    <span className="anl-var-name">{v.name}</span>
                    <span className="anl-var-type">{v.type}</span>
                    <span className="anl-var-val">{v.value}</span>
                  </div>
                ))}
              </div>
        )}
        {tab === "packages" && (
          <>
            <div className="anl-pkg-row">
              <input value={packageInput} onChange={(e) => setPackageInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInstall()} placeholder="Package name..." className="anl-pkg-input" />
              <button className="anl-pkg-btn" onClick={handleInstall} disabled={!kernelIdle}>Install</button>
            </div>
            <div className="anl-pkg-installed">
              <span className="anl-pkg-label">Project deps:</span>
              {dependencies.map((d) => <span key={d} className="anl-pkg-tag">{d}</span>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
