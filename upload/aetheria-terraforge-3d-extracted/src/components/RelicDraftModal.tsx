import React from 'react';
import confetti from 'canvas-confetti';
import { Relic } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface RelicDraftModalProps {
  relics: Relic[];
  onSelectRelic: (relic: Relic) => void;
}

export const RelicDraftModal: React.FC<RelicDraftModalProps> = ({ relics, onSelectRelic }) => {
  if (relics.length === 0) return null;

  const getRarityBadge = (rarity: Relic['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return { label: '传世天工 (Legendary)', color: 'border-[#ffd700] text-[#ffd700] bg-[#423200]' };
      case 'epic':
        return { label: '极品秘术 (Epic)', color: 'border-[#b388ff] text-[#b388ff] bg-[#2d1b4e]' };
      case 'rare':
        return { label: '稀世遗物 (Rare)', color: 'border-[#70d6ff] text-[#70d6ff] bg-[#122e40]' };
      default:
        return { label: '先民残章 (Common)', color: 'border-[#b59e79] text-[#b59e79] bg-[#292218]' };
    }
  };

  const handlePick = (relic: Relic) => {
    soundManager.playWarHorn();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ff9f1c', '#e76f51', '#2a9d8f'],
      });
    } catch {
      // ignore
    }
    onSelectRelic(relic);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="max-w-4xl w-full parchment-panel rounded-3xl border-2 border-[#b8860b] p-6 shadow-2xl relative flex flex-col gap-6">
        {/* Top Header */}
        <div className="text-center relative">
          <div className="inline-block wax-seal w-12 h-12 rounded-full absolute -top-12 left-1/2 -translate-x-1/2 flex items-center justify-center text-xl shadow-lg border-2 border-[#d97706]">
            ⚜️
          </div>
          <div className="text-xs uppercase tracking-widest text-[#d4af37] font-cinzel font-bold mt-2">
            · 波次凯旋 · 先祖誓约 ·
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-decorative text-[#fff5e1] mt-1">
            恭迎地脉先贤的馈赠
          </h2>
          <p className="text-sm text-[#c7b299] max-w-lg mx-auto mt-1 italic">
            大地响应了你的坚守，三枚刻印着远古法则的遗物在此显现。择其一而行，重塑战阵之理。
          </p>
        </div>

        {/* 3 Relic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {relics.map((relic, idx) => {
            const badge = getRarityBadge(relic.rarity);
            return (
              <div
                key={relic.id}
                onClick={() => handlePick(relic)}
                className="group relative cursor-pointer rounded-2xl border-2 border-[#7c6241] hover:border-[#ffd700] bg-gradient-to-b from-[#2a2016] via-[#1c1610] to-[#120e0a] p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(212,175,55,0.25)] ring-1 ring-inset ring-[#8b6f4e]/40"
              >
                {/* Roman Numeral */}
                <div className="text-right text-[11px] font-cinzel text-[#8c7457] font-bold">
                  {idx === 0 ? 'I' : idx === 1 ? 'II' : 'III'}
                </div>

                {/* Icon & Title */}
                <div className="text-center my-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#140f0b] border border-[#6b5235] group-hover:border-[#ffd700] flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                    {relic.icon}
                  </div>
                  <h3 className="text-base font-bold font-cinzel text-[#f7e7c4] mt-3 group-hover:text-[#ffd700]">
                    {relic.name}
                  </h3>
                  <div className={`inline-block text-[10px] px-2 py-0.5 rounded-full border mt-1.5 font-cinzel ${badge.color}`}>
                    {badge.label}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-[#18120c]/90 p-3 rounded-xl border border-[#4a3926] my-2 text-xs text-[#ecdcb9] leading-relaxed">
                  {relic.description}
                </div>

                {/* Flavor Quote */}
                <div className="text-[11px] text-[#917d66] italic text-center font-serif mt-1">
                  {relic.flavor}
                </div>

                {/* Select Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePick(relic);
                  }}
                  className="brass-button mt-4 py-2 px-4 rounded-xl text-xs font-bold font-cinzel w-full text-center group-hover:shadow-[0_0_15px_rgba(255,215,0,0.5)]"
                >
                  立契封印 · 选择此印记
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
