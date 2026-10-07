'use client';

import React from 'react';
import { PlacedTower, TowerSpecialization } from '@/types/game';
import { TOWER_CONFIGS } from '@/game/gameData';
import { soundManager } from '@/audio/soundManager';

interface SpecializationModalProps {
  tower: PlacedTower | null;
  options: TowerSpecialization[];
  onSelect: (towerId: string, spec: TowerSpecialization) => void;
}

const SPEC_META: Record<TowerSpecialization, { name: string; icon: string; description: string; tag: string }> = {
  rapid_fire: {
    name: '急速射击',
    icon: '⚡',
    description: '射速 +60%，但伤害 -10%。适合对抗蜂拥而至的小怪群。',
    tag: '攻速流',
  },
  siege_master: {
    name: '攻城专精',
    icon: '💣',
    description: '伤害 +80%，射速 -30%，溅射范围 +20%。重甲单位的克星。',
    tag: '重击流',
  },
  overcharge: {
    name: '过载充能',
    icon: '✨',
    description: '射程 +50%，伤害 +25%，但每次攻击消耗双倍灵能。',
    tag: '远程流',
  },
  fortified: {
    name: '高地加固',
    icon: '🏰',
    description: '高地加成翻倍，2 层以上时额外 +15% 伤害。',
    tag: '地形流',
  },
  crystalline: {
    name: '晶体增幅',
    icon: '💎',
    description: '在源石晶簇旁时伤害 +40%。',
    tag: '资源流',
  },
  frostfire: {
    name: '霜焰共生',
    icon: '🔥❄️',
    description: '同时施加减速与燃烧效果，效果持续时间 +35%。',
    tag: '元素流',
  },
  siege_breaker: {
    name: '破甲专精',
    icon: '⚔️',
    description: '完全无视敌人护甲，对首领伤害 +30%。',
    tag: '反甲流',
  },
  swarm_slayer: {
    name: '群敌克星',
    icon: '🎯',
    description: '对非首领敌人伤害 +50%；周围 5+ 敌人时射速 +20%。',
    tag: '清场流',
  },
};

export const SpecializationModal: React.FC<SpecializationModalProps> = ({ tower, options, onSelect }) => {
  if (!tower) return null;

  const towerCfg = TOWER_CONFIGS[tower.type];
  const towerName = towerCfg ? towerCfg.name.split(' ')[0] : tower.type;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="max-w-2xl w-full parchment-panel rounded-3xl border-2 border-[#b8860b] p-6 shadow-2xl relative flex flex-col gap-4">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-cinzel font-bold">
            · 专精觉醒 ·
          </div>
          <h2 className="text-2xl font-bold font-decorative text-[#fff5e1] mt-1">
            {towerName} 升至 Lv.3
          </h2>
          <p className="text-sm text-[#c7b299] italic max-w-lg mx-auto mt-1">
            该防御塔已抵达专精分支。择一进化路线，永久塑造其战场角色。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {options.map((spec) => {
            const meta = SPEC_META[spec];
            return (
              <button
                key={spec}
                onClick={() => {
                  soundManager.playWarHorn();
                  onSelect(tower.id, spec);
                }}
                className="group relative p-4 rounded-2xl border-2 border-[#7c6241] hover:border-[#ffd700] bg-gradient-to-b from-[#2a2016] via-[#1c1610] to-[#120e0a] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(212,175,55,0.25)]"
              >
                <div>
                  <div className="text-3xl text-center my-2">{meta.icon}</div>
                  <h3 className="text-base font-bold font-cinzel text-[#f7e7c4] text-center group-hover:text-[#ffd700]">
                    {meta.name}
                  </h3>
                  <div className="text-[10px] text-[#d4af37] text-center uppercase tracking-wider font-cinzel mt-0.5">
                    {meta.tag}
                  </div>
                </div>
                <div className="bg-[#18120c]/90 p-2.5 rounded-xl border border-[#4a3926] mt-2 text-[11px] text-[#ecdcb9] leading-relaxed text-center">
                  {meta.description}
                </div>
                <div className="text-[10px] text-[#917d66] italic text-center mt-2 font-cinzel">
                  · 不可逆 ·
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center text-[10px] text-[#7c6241] font-cinzel tracking-wider">
          ⚠ 此选择将永久改变该塔的进化路线，无法重置
        </div>
      </div>
    </div>
  );
};
