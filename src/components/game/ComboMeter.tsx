'use client';

import React from 'react';

interface ComboMeterProps {
  combo: { current: number; multiplier: number; max: number; comboTimer?: number } | null;
}

/**
 * Floating combo meter that appears during active combos.
 * Renders a tier-colored bar with the kill count and current multiplier.
 */
export const ComboMeter: React.FC<ComboMeterProps> = ({ combo }) => {
  if (!combo || combo.current < 2) return null;

  const tier = Math.min(5, Math.floor(combo.current / 5));
  const tierColors = ['#aa9577', '#c2a275', '#d6af68', '#ffd700', '#ff9f1c', '#e76f51'];
  const tierLabels = ['—', '⚡', '🔥', '💎', '🏆', '👑'];
  const color = tierColors[tier];
  const label = tierLabels[tier];

  return (
    <div className="absolute top-16 right-3 md:right-4 z-30 pointer-events-none animate-in fade-in slide-in-from-right-4 duration-300">
      <div
        className="parchment-card px-3 py-2 rounded-2xl border-2 flex items-center gap-2 shadow-2xl"
        style={{ borderColor: color, boxShadow: `0 0 12px ${color}55, inset 0 0 10px ${color}22` }}
      >
        <span className="text-2xl">{label}</span>
        <div className="flex flex-col items-start">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-cinzel leading-none" style={{ color }}>
              {combo.current}
            </span>
            <span className="text-[10px] text-[#aa9577] uppercase font-cinzel tracking-wider">
              Combo
            </span>
          </div>
          <div className="text-xs font-mono-code font-bold" style={{ color }}>
            ×{combo.multiplier.toFixed(2)} 增益
          </div>
        </div>
        {/* Timer ring (visual only — combo timer is 2.5s) */}
        <div className="relative w-7 h-7 ml-1">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="14" cy="14" r="11" stroke="#3a2216" strokeWidth="2.5" fill="none" />
            <circle
              cx="14"
              cy="14"
              r="11"
              stroke={color}
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="69.1"
              strokeDashoffset={69.1 - (69.1 * Math.min(100, combo.comboTimer ? (combo.comboTimer / 2.5) * 100 : 0)) / 100}
              strokeLinecap="round"
              className="transition-all duration-100"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono-code font-bold" style={{ color }}>
            ⚔
          </span>
        </div>
      </div>
    </div>
  );
};
