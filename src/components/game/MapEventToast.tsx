'use client';

import React, { useEffect, useState } from 'react';
import { MapEvent } from '@/types/game';

interface MapEventToastProps {
  event: MapEvent | null;
  onDismiss: () => void;
}

/**
 * Big celebratory toast shown when a map event triggers (meteor, blessing, etc).
 * Auto-dismisses after 4 seconds.
 */
export const MapEventToast: React.FC<MapEventToastProps> = ({ event, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!event) return;
    setVisible(false);
    const showTimer = setTimeout(() => setVisible(true), 30);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 4000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [event, onDismiss]);

  if (!event) return null;

  return (
    <div className="fixed top-1/4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div
        className={`parchment-panel rounded-3xl border-2 border-[#ffd700] shadow-2xl p-5 max-w-md text-center transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'
        }`}
        style={{ boxShadow: '0 12px 36px rgba(0,0,0,0.7), 0 0 24px rgba(255,215,0,0.4)' }}
      >
        <div className="text-5xl mb-2 animate-bounce">{event.icon}</div>
        <div className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-cinzel font-bold mb-1">
          战场异变
        </div>
        <h3 className="text-xl font-bold font-decorative text-[#fff5e1] mb-1">
          {event.name}
        </h3>
        <p className="text-sm text-[#c7b299] italic">{event.description}</p>
      </div>
    </div>
  );
};
