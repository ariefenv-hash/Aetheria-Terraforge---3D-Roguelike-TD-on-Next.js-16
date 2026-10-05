'use client';

import React, { useEffect, useState } from 'react';
import { Achievement } from '@/types/game';
import { soundManager } from '@/audio/soundManager';

interface AchievementToastProps {
  queue: Achievement[];
  onDismiss: (id: string) => void;
}

/** Stack of celebratory toasts shown when achievements unlock. */
export const AchievementToast: React.FC<AchievementToastProps> = ({ queue, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {queue.map((a) => (
        <ToastItem key={a.id} ach={a} onDismiss={() => onDismiss(a.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ ach: Achievement; onDismiss: () => void }> = ({
  ach,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    soundManager.playWarHorn();
    // Animate in
    const showTimer = setTimeout(() => setVisible(true), 30);
    // Auto-dismiss after 5 seconds
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 5000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [ach.id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto parchment-panel rounded-2xl border-2 border-[#ffd700] shadow-2xl p-3 flex items-center gap-3 w-72 transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
    >
      <div className="text-3xl flex-shrink-0 animate-bounce">{ach.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-[#d4af37] font-cinzel font-bold">
          ✓ 成就解锁
        </div>
        <div className="text-sm font-cinzel font-bold text-[#ffd700] truncate">{ach.name}</div>
        <div className="text-[11px] text-[#c7b299] leading-snug line-clamp-2">{ach.description}</div>
      </div>
    </div>
  );
};
