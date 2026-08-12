import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ReactElement } from 'react';

const CIRCUIT_SYMBOLS: Record<string, ReactElement> = {
  resistor: (
    <svg width="40" height="20" viewBox="0 0 40 20">
      <path d="M0,10 L5,10 L8,2 L12,18 L16,2 L20,18 L24,2 L28,18 L32,2 L35,10 L40,10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  capacitor: (
    <svg width="40" height="24" viewBox="0 0 40 24">
      <line x1="0" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="16" y1="4" x2="16" y2="20" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="4" x2="24" y2="20" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="12" x2="40" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  inductor: (
    <svg width="40" height="20" viewBox="0 0 40 20">
      <path d="M0,15 L5,15 Q10,15 10,10 Q10,5 15,5 Q20,5 20,10 Q20,15 25,15 Q30,15 30,10 Q30,5 35,5 Q40,5 40,15" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  led: (
    <svg width="36" height="24" viewBox="0 0 36 24">
      <polygon points="10,4 10,20 26,12" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="26" y1="4" x2="26" y2="20" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="0" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="26" y1="12" x2="36" y2="12" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="22" y1="2" x2="28" y2="0" stroke="currentColor" strokeWidth="1" markerEnd="url(#arrow)"/>
      <line x1="24" y1="5" x2="30" y2="3" stroke="currentColor" strokeWidth="1" markerEnd="url(#arrow)"/>
    </svg>
  ),
  diode: (
    <svg width="36" height="24" viewBox="0 0 36 24">
      <polygon points="10,4 10,20 26,12" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="26" y1="4" x2="26" y2="20" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="0" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="26" y1="12" x2="36" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  transistor: (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <line x1="12" y1="8" x2="12" y2="28" stroke="currentColor" strokeWidth="2"/>
      <line x1="0" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="12" y1="12" x2="28" y2="4" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="12" y1="24" x2="28" y2="32" stroke="currentColor" strokeWidth="1.5"/>
      <polygon points="22,28 28,32 24,24" fill="currentColor"/>
    </svg>
  ),
  ic: (
    <svg width="44" height="32" viewBox="0 0 44 32">
      <rect x="8" y="4" width="28" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="0" y1="10" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="0" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="0" y1="22" x2="8" y2="22" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="36" y1="10" x2="44" y2="10" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="36" y1="16" x2="44" y2="16" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="36" y1="22" x2="44" y2="22" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="13" cy="9" r="2" fill="currentColor"/>
    </svg>
  ),
  opamp: (
    <svg width="44" height="36" viewBox="0 0 44 36">
      <polygon points="4,4 4,32 40,18" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="0" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="0" y1="24" x2="4" y2="24" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="40" y1="18" x2="44" y2="18" stroke="currentColor" strokeWidth="1.5"/>
      <text x="8" y="14" fontSize="8" fill="currentColor">+</text>
      <text x="8" y="27" fontSize="8" fill="currentColor">−</text>
    </svg>
  ),
  vcc: (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <line x1="12" y1="24" x2="12" y2="8" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="4" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="2"/>
      <polygon points="12,2 8,8 16,8" fill="currentColor"/>
    </svg>
  ),
  ground: (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <line x1="12" y1="0" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2"/>
      <line x1="7" y1="16" x2="17" y2="16" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="10" y1="20" x2="14" y2="20" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  switch: (
    <svg width="36" height="20" viewBox="0 0 36 20">
      <circle cx="8" cy="14" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="28" cy="14" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="0" y1="14" x2="5" y2="14" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="31" y1="14" x2="36" y2="14" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="11" y1="14" x2="25" y2="6" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  battery: (
    <svg width="36" height="24" viewBox="0 0 36 24">
      <line x1="0" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="14" y1="4" x2="14" y2="20" stroke="currentColor" strokeWidth="2.5"/>
      <line x1="20" y1="8" x2="20" y2="16" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="20" y1="12" x2="36" y2="12" stroke="currentColor" strokeWidth="1.5"/>
      <text x="12" y="3" fontSize="7" fill="currentColor">+</text>
      <text x="19" y="3" fontSize="7" fill="currentColor">−</text>
    </svg>
  ),
};

export default function CircuitNode({ data, selected }: NodeProps) {
  const component = (data.component as string) || 'resistor';
  const value = (data.value as string) || '';
  const symbol = CIRCUIT_SYMBOLS[component];

  return (
    <div className={`flow-node flow-node--circuit flow-node--circuit-${component} ${selected ? 'flow-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} id="top-in" />
      <div className="circuit-symbol">{symbol}</div>
      <div className="circuit-info">
        <span className="circuit-label">{data.label as string}</span>
        {value && <span className="circuit-value">{value}</span>}
      </div>
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="bottom-out" />
    </div>
  );
}
