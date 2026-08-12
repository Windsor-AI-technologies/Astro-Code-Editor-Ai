import { invoke } from "@tauri-apps/api/core";
import "./UpgradeWall.css";

interface UpgradeWallProps {
  feature: string;
  description: string;
  isAddon?: boolean;
}

export default function UpgradeWall({
  feature,
  description,
  isAddon,
}: UpgradeWallProps) {
  const openPlans = async () => {
    try {
      await invoke("perl_open_url", {
        url: "https://astro-backend.garzaromerojeshuaabiram2019ktv.workers.dev/plans",
      });
    } catch {
      window.open(
        "https://astro-backend.garzaromerojeshuaabiram2019ktv.workers.dev/plans",
        "_blank",
      );
    }
  };

  return (
    <div className="upgrade-wall">
      <div className="upgrade-wall-content">
        <svg
          className="upgrade-wall-icon"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
        >
          <rect
            x="3"
            y="11"
            width="18"
            height="11"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M7 11V7a5 5 0 0 1 10 0v4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16" r="1.5" fill="currentColor" />
        </svg>
        <h2>{feature}</h2>
        <p>{description}</p>
        <button className="upgrade-wall-btn" onClick={openPlans}>
          {isAddon ? "Activate Add-on" : "Upgrade to Pro"}
        </button>
        <span className="upgrade-wall-hint">
          {isAddon ? <><s className="upgrade-wall-old-price">$200</s> $25/month — works with any plan</> : "Starting at $9/month"}
        </span>
      </div>
    </div>
  );
}
