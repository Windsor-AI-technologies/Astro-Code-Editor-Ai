/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import { useEffect, useState } from 'react';
import { useUICtx } from '../../../contexts/UIContext';
import './Notification.css';

const EXIT_MS = 300;

export default function Notification() {
  const { notification } = useUICtx();
  const [displayed, setDisplayed] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (notification) {
      setDisplayed(notification);
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
  }, [notification]);

  if (!displayed) return null;

  return (
    <div className={`notification-toast${closing ? ' closing' : ''}`}>
      <span className="notification-text">{displayed}</span>
    </div>
  );
}
