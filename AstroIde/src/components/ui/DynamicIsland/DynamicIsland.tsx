/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { useEffect, useState } from 'react';
import { useUICtx } from '../../../contexts/UIContext';
import './DynamicIsland.css';

const EXIT_MS = 300;

export default function DynamicIsland() {
  const { island } = useUICtx();
  const [displayed, setDisplayed] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (island) {
      setDisplayed(island);
      setClosing(false);
      return;
    }
    if (displayed) {
      // El estado se limpió → animar salida antes de desmontar
      setClosing(true);
      const t = setTimeout(() => {
        setDisplayed(null);
        setClosing(false);
      }, EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [island]);

  if (!displayed) return null;

  return (
    <div className={`dynamic-island${closing ? ' closing' : ''}`}>
      <span className="dynamic-island-dot" />
      <span className="dynamic-island-text">{displayed}</span>
    </div>
  );
}
