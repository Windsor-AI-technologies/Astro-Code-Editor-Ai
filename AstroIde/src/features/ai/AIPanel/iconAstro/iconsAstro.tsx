export default function BlackHoleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="url(#bh-grad)"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="16" cy="16" r="6" fill="#0a0a0f" />
      <circle cx="16" cy="16" r="4" fill="url(#bh-core)" />
      <ellipse
        cx="16"
        cy="16"
        rx="12"
        ry="5"
        stroke="url(#bh-ring)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="10"
        ry="3.5"
        stroke="var(--accent)"
        strokeWidth="0.8"
        fill="none"
        opacity="0.4"
      />
      <defs>
        <radialGradient id="bh-core">
          <stop offset="0%" stopColor="#7aa2f7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0a0a0f" />
        </radialGradient>
        <linearGradient id="bh-grad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="#bb9af7" />
        </linearGradient>
        <linearGradient id="bh-ring" x1="0" y1="16" x2="32" y2="16">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#bb9af7" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.9" />
        </linearGradient>
      </defs>
    </svg>
  );
}
