import { useRef, useEffect, useState } from "react";
import { Code2, Bot, Palette, Cpu, Database, Music } from "lucide-react";
import "./ModeSwitcher.css";

export type AppMode = "ide" | "agent" | "design" | "electronics" | "data" | "music" | "flowchart" | "chartScatter";

interface ModeSwitcherProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const MODES: { id: AppMode; label: string; icon: React.ReactNode }[] = [
  { id: "ide", label: "IDE", icon: <Code2 size={13} /> },
  { id: "agent", label: "Agent", icon: <Bot size={13} /> },
  { id: "design", label: "Design", icon: <Palette size={13} /> },
  { id: "electronics", label: "Electronics", icon: <Cpu size={13} /> },
  { id: "data", label: "Data", icon: <Database size={13} /> },
  { id: "music", label: "Music", icon: <Music size={13} /> },
];

export default function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector(
      ".mode-btn.active",
    ) as HTMLElement;
    if (!activeBtn) return;

    setSliderStyle({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
  }, [mode]);

  return (
    <div className="mode-switcher" ref={containerRef}>
      <div
        className="mode-slider"
        style={{ left: sliderStyle.left, width: sliderStyle.width }}
      />
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`mode-btn ${mode === m.id ? "active" : ""}`}
          onClick={() => onChange(m.id)}
          title={m.label}
        >
          {m.icon}
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}
