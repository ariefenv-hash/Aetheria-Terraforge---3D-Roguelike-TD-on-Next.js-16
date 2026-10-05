import React from 'react';
import { TowerType } from '../types/game';
import { TOWER_CONFIGS } from '../game/gameData';
import { soundManager } from '../audio/soundManager';

interface TowerBuildPanelProps {
  selectedTower: TowerType | null;
  onSelectTower: (type: TowerType | null) => void;
  aether: number;
  mana: number;
  sparks: number;
}

export const TowerBuildPanel: React.FC<TowerBuildPanelProps> = ({
  selectedTower,
  onSelectTower,
  aether,
  mana,
  sparks,
}) => {
  const towers = Object.values(TOWER_CONFIGS);

  const getDamageIcon = (type: string) => {
    switch (type) {
      case 'fire':
        return '🔥 炎击';
      case 'frost':
        return '❄️ 寒霜';
      case 'energy':
        return '⚡ 奥术';
      case 'earth':
        return '🪨 重击';
      default:
        return '🏹 物理';
    }
  };

  return (
    <div className="absolute bottom-2 md:bottom-4 left-0 right-0 z-20 pointer-events-none flex justify-center px-2">
      <div className="pointer-events-auto parchment-panel p-2 rounded-2xl border border-[#997843] max-w-5xl w-full shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between px-2 pb-1.5 mb-1.5 border-b border-[#634f35]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-cinzel text-[#ffd700]">🏰 防御工械与术式枢纽</span>
            <span className="text-[11px] text-[#aa9577] hidden sm:inline">
              (点击选中后在地块上构筑 · 高度越高射程越远)
            </span>
          </div>
          {selectedTower && (
            <button
              onClick={() => onSelectTower(null)}
              className="text-[11px] text-[#e0cfb3] hover:text-[#ffd700] px-2 py-0.5 rounded bg-[#33251a] border border-[#6b4f2c]"
            >
              取消选中 [Esc]
            </button>
          )}
        </div>

        {/* Horizontal scrollable cards */}
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-1.5 md:gap-2 overflow-x-auto pb-1">
          {towers.map((cfg, index) => {
            const isSelected = selectedTower === cfg.type;
            const canAfford =
              aether >= cfg.cost.aether &&
              mana >= cfg.cost.mana &&
              sparks >= (cfg.cost.sparks || 0);

            return (
              <button
                key={cfg.type}
                disabled={!canAfford && !isSelected}
                onClick={() => {
                  soundManager.playClick();
                  onSelectTower(isSelected ? null : cfg.type);
                }}
                className={`relative p-1.5 rounded-xl border text-left transition-all flex flex-col justify-between h-[92px] ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#6b4e2d] to-[#3a2716] border-[#ffd700] ring-2 ring-[#ffd700] shadow-lg transform -translate-y-1'
                    : canAfford
                    ? 'bg-[#221a14]/90 border-[#614e36] hover:border-[#caa368] hover:bg-[#32251a]'
                    : 'bg-[#18130e]/70 border-[#3d3022] opacity-50 cursor-not-allowed'
                }`}
              >
                {/* Hotkey Tag */}
                <div className="absolute top-1 right-1 text-[9px] font-mono-code font-bold px-1 rounded bg-[#100c09] text-[#ffd700] border border-[#52402b]">
                  {index + 1}
                </div>

                {/* Name */}
                <div className="pr-4">
                  <div className="text-[11px] font-bold font-cinzel leading-tight text-[#f5ebd7] truncate">
                    {cfg.name.split(' ')[0]}
                  </div>
                  <div className="text-[9px] text-[#b39e82] leading-tight flex items-center gap-1 mt-0.5">
                    <span>{getDamageIcon(cfg.damageType)}</span>
                  </div>
                </div>

                {/* Stats Mini */}
                <div className="text-[9px] font-mono-code text-[#a89070] flex items-center justify-between">
                  <span>射程 {cfg.range.toFixed(1)}</span>
                  {cfg.damage > 0 && <span>伤 {cfg.damage}</span>}
                </div>

                {/* Cost Row */}
                <div className="flex items-center gap-1 pt-1 border-t border-[#473623] text-[10px] font-mono-code font-bold">
                  <span className="text-[#ffd580]">{cfg.cost.aether}🪨</span>
                  {cfg.cost.mana > 0 && <span className="text-[#70d6ff]">{cfg.cost.mana}⚡</span>}
                  {cfg.cost.sparks && cfg.cost.sparks > 0 && (
                    <span className="text-[#ff9f1c]">{cfg.cost.sparks}🔨</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
