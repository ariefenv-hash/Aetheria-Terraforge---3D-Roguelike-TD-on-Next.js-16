import React from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Trophy, Skull, Mountain, Sparkles } from 'lucide-react';
import { GameStats, Relic } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface GameOverModalProps {
  isOpen: boolean;
  isVictory: boolean;
  wave: number;
  stats: GameStats;
  relics: Relic[];
  onRestart: (biome: 'alpine' | 'volcano' | 'marsh' | 'crystal_abyss') => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  isVictory,
  wave,
  stats,
  relics,
  onRestart,
}) => {
  if (!isOpen) return null;

  if (isVictory) {
    try {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 },
      });
    } catch {
      // ignore
    }
  }

  const getRank = () => {
    const score = stats.enemiesDefeated * 10 + wave * 150 + stats.bossesSlain * 600;
    if (score > 6000) return '神话级·创世地脉塑者 (Genesis Titan)';
    if (score > 4000) return '天阶·高阶地动大宗师 (Grand Geomancer)';
    if (score > 2500) return '守望阶·坚毅要塞军督 (Citadel Commander)';
    return '学徒阶·初阶筑城工匠 (Apprentice Architect)';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="max-w-lg w-full parchment-panel rounded-3xl border-2 border-[#b8860b] shadow-2xl p-6 relative flex flex-col gap-4 text-center">
        {/* Heraldic Crest */}
        <div className="wax-seal w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl shadow-xl border-2 border-[#ffd700]">
          {isVictory ? '👑' : '💀'}
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-[#ffd700] font-cinzel font-bold">
            {isVictory ? '· 地脉永恒 · 凯旋纪功 ·' : '· 核心崩解 · 战阵长逝 ·'}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-decorative text-[#fff5e1] mt-1">
            {isVictory ? '全境涤清·先祖神迹铸成' : '防线溃败·深渊裂隙吞噬'}
          </h2>
          <div className="text-xs text-[#d1c0a5] mt-1 italic font-cinzel">
            {getRank()}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 my-2 text-left">
          <div className="bg-[#1c1510] p-2.5 rounded-xl border border-[#523e29]">
            <div className="text-[11px] text-[#aa9577]">最高抵御波次</div>
            <div className="text-lg font-bold font-mono-code text-[#ffd700]">{wave} 波</div>
          </div>
          <div className="bg-[#1c1510] p-2.5 rounded-xl border border-[#523e29]">
            <div className="text-[11px] text-[#aa9577]">击溃异界魔物</div>
            <div className="text-lg font-bold font-mono-code text-[#ff9999]">
              {stats.enemiesDefeated} 尊
            </div>
          </div>
          <div className="bg-[#1c1510] p-2.5 rounded-xl border border-[#523e29]">
            <div className="text-[11px] text-[#aa9577]">重塑地表次数</div>
            <div className="text-lg font-bold font-mono-code text-[#70d6ff]">
              {stats.tilesTerraformed} 次
            </div>
          </div>
          <div className="bg-[#1c1510] p-2.5 rounded-xl border border-[#523e29]">
            <div className="text-[11px] text-[#aa9577]">斩获泰坦首领</div>
            <div className="text-lg font-bold font-mono-code text-[#ff9f1c]">
              {stats.bossesSlain} 尊
            </div>
          </div>
        </div>

        {/* Relics Gathered */}
        {relics.length > 0 && (
          <div className="border-t border-[#523e29] pt-2 text-left">
            <div className="text-xs text-[#a89070] font-cinzel mb-1.5 flex items-center gap-1">
              <Sparkles size={13} className="text-[#ffd700]" /> 征途结契秘宝 ({relics.length}):
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {relics.map((r) => (
                <span
                  key={r.id}
                  className="px-2 py-0.5 rounded-lg bg-[#271d15] border border-[#6b5235] text-[11px] text-[#ebdcb9] flex items-center gap-1"
                >
                  <span>{r.icon}</span>
                  <span>{r.name.split(' ')[0]}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Restart Options */}
        <div className="border-t border-[#523e29] pt-3 flex flex-col gap-2">
          <div className="text-xs text-[#a89070] font-cinzel">选择新征程地貌战场:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                soundManager.playWarHorn();
                onRestart('alpine');
              }}
              className="brass-button py-2 px-2 rounded-xl text-xs font-bold font-cinzel flex items-center justify-center gap-1"
            >
              <span>⛰️ 高山要塞</span>
            </button>
            <button
              onClick={() => {
                soundManager.playWarHorn();
                onRestart('volcano');
              }}
              className="brass-button py-2 px-2 rounded-xl text-xs font-bold font-cinzel flex items-center justify-center gap-1"
            >
              <span>🌋 熔岩火口</span>
            </button>
            <button
              onClick={() => {
                soundManager.playWarHorn();
                onRestart('marsh');
              }}
              className="brass-button py-2 px-2 rounded-xl text-xs font-bold font-cinzel flex items-center justify-center gap-1"
            >
              <span>🌊 迷雾泽国</span>
            </button>
            <button
              onClick={() => {
                soundManager.playWarHorn();
                onRestart('crystal_abyss');
              }}
              className="brass-button py-2 px-2 rounded-xl text-xs font-bold font-cinzel flex items-center justify-center gap-1"
            >
              <span>💎 源石深渊</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
