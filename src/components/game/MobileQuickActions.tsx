'use client';

import React from 'react';
import { Pause, Play, FastForward, RotateCcw } from 'lucide-react';
import { soundManager } from '@/audio/soundManager';

interface MobileQuickActionsProps {
  isPaused: boolean;
  gameSpeed: number;
  isWaveInProgress: boolean;
  onTogglePause: () => void;
  onCycleSpeed: () => void;
  onResetCamera: () => void;
}

/**
 * Mobile-only floating action buttons (FAB) for quick access during gameplay.
 * Renders only on screens < 768px (md breakpoint) — desktop uses top bar instead.
 */
export const MobileQuickActions: React.FC<MobileQuickActionsProps> = ({
  isPaused,
  gameSpeed,
  isWaveInProgress,
  onTogglePause,
  onCycleSpeed,
  onResetCamera,
}) => {
  return (
    <div className="md:hidden absolute top-3 right-3 z-30 pointer-events-auto flex flex-col gap-2">
      {/* Pause/Play FAB */}
      <button
        onClick={() => { soundManager.playClick(); onTogglePause(); }}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl border-2 backdrop-blur-md ${
          isPaused
            ? 'bg-[#57432c] border-[#ffd700] text-[#ffd700]'
            : 'bg-[#271d13]/90 border-[#a3824f] text-[#f7e7c4]'
        }`}
        aria-label={isPaused ? '继续' : '暂停'}
        title={isPaused ? '继续' : '暂停'}
      >
        {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} />}
      </button>

      {/* Speed FAB (only during wave) */}
      {isWaveInProgress && (
        <button
          onClick={() => { soundManager.playClick(); onCycleSpeed(); }}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-[#271d13]/90 border-2 border-[#a3824f] text-[#ffd700] shadow-2xl backdrop-blur-md"
          aria-label={`游戏速度 ${gameSpeed}x`}
          title="切换游戏速度"
        >
          <FastForward size={20} />
          <span className="text-xs font-bold font-mono-code absolute bottom-0.5 right-1.5">
            {gameSpeed}×
          </span>
        </button>
      )}

      {/* Reset Camera FAB */}
      <button
        onClick={() => { soundManager.playClick(); onResetCamera(); }}
        className="w-12 h-12 rounded-full flex items-center justify-center bg-[#271d13]/90 border-2 border-[#a3824f] text-[#f7e7c4] shadow-2xl backdrop-blur-md"
        aria-label="重置视角"
        title="重置视角"
      >
        <RotateCcw size={18} />
      </button>
    </div>
  );
};
