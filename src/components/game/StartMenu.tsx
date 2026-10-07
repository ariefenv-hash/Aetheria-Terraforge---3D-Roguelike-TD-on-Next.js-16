'use client';

import React, { useEffect, useState } from 'react';
import { ACHIEVEMENTS, profileManager } from '@/game/profileManager';
import { DIFFICULTY_CONFIG } from '@/game/gameState';
import { Difficulty } from '@/types/game';
import { soundManager } from '@/audio/soundManager';
import { Mountain, Flame, Droplet, Gem, Trophy, Sparkles, Infinity as InfinityIcon, HelpCircle, Calendar } from 'lucide-react';

export interface RunConfig {
  biome: 'alpine' | 'volcano' | 'marsh' | 'crystal_abyss';
  difficulty: Difficulty;
  endlessMode: boolean;
}

interface StartMenuProps {
  onStart: (cfg: RunConfig) => void;
  onOpenCodex: () => void;
}

const BIOMES: {
  id: 'alpine' | 'volcano' | 'marsh' | 'crystal_abyss';
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}[] = [
  {
    id: 'alpine',
    name: '苍峦雪境',
    icon: <Mountain size={32} />,
    description: '高耸山岭，多高地适合远射；偶有暴风雪。',
    color: 'from-[#4a7a9b]/30 to-[#1a2b3b]/60 border-[#6a9bc0]',
  },
  {
    id: 'volcano',
    name: '炽焰熔境',
    icon: <Flame size={32} />,
    description: '熔岩炽流横贯，敌人天生抗火；常降灰烬。',
    color: 'from-[#8a3520]/30 to-[#2a1010]/60 border-[#d34a26]',
  },
  {
    id: 'marsh',
    name: '幽雾沼泽',
    icon: <Droplet size={32} />,
    description: '潮湿低洼，常引雷暴；雷击导电地势险。',
    color: 'from-[#3a6b4a]/30 to-[#1a2a1b]/60 border-[#5a8b6a]',
  },
  {
    id: 'crystal_abyss',
    name: '晶界深渊',
    icon: <Gem size={32} />,
    description: '晶脉遍地，资源富庶；幽雾弥漫视野窄。',
    color: 'from-[#7a3a8b]/30 to-[#2a1a3b]/60 border-[#9a5abb]',
  },
];

export const StartMenu: React.FC<StartMenuProps> = ({ onStart, onOpenCodex }) => {
  const [biome, setBiome] = useState<'alpine' | 'volcano' | 'marsh' | 'crystal_abyss'>('alpine');
  const [difficulty, setDifficulty] = useState<Difficulty>('adept');
  const [endless, setEndless] = useState(false);
  const [profile, setProfile] = useState(profileManager.load());
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Reload profile (in case it changed from another tab)
  useEffect(() => {
    setProfile(profileManager.load());
  }, []);

  const unlockedCount = profile.unlockedAchievements.length;
  const totalAch = ACHIEVEMENTS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center aetheria-splash p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl parchment-panel rounded-3xl border-2 border-[#b8860b] p-6 md:p-8 shadow-2xl flex flex-col gap-5 max-h-[95vh] overflow-y-auto">
        {/* Wax seal */}
        <div className="inline-block wax-seal w-14 h-14 rounded-full absolute -top-7 left-1/2 -translate-x-1/2 flex items-center justify-center text-2xl shadow-lg border-2 border-[#d97706]">
          ⚜️
        </div>

        {/* Title */}
        <div className="text-center mt-3">
          <div className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-cinzel font-bold">
            · 大地熔铸 · 筑城序章 ·
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-decorative text-[#fff5e1] mt-2">
            Aetheria · Terraforge
          </h1>
          <p className="text-sm text-[#c7b299] max-w-xl mx-auto mt-1 italic">
            以大地为砧，铸就命运之塔。选择你的领地、你的考验、与你的征程。
          </p>
        </div>

        {/* Biome selection */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#ffd700] text-lg">🌍</span>
            <h2 className="text-sm font-bold font-cinzel text-[#ffd700] tracking-wider">选择领地 · CHOOSE BIOME</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {BIOMES.map((b) => {
              const sel = biome === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    soundManager.playClick();
                    setBiome(b.id);
                  }}
                  className={`relative p-3 rounded-2xl bg-gradient-to-br ${b.color} border-2 text-left transition-all flex flex-col gap-2 ${
                    sel ? 'ring-2 ring-[#ffd700] shadow-lg -translate-y-0.5' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="text-[#f7e7c4] mb-1">{b.icon}</div>
                  <div className="font-cinzel font-bold text-sm text-[#fff5e1]">{b.name}</div>
                  <div className="text-[11px] text-[#d6c4a6] leading-snug">{b.description}</div>
                  {sel && (
                    <div className="absolute top-2 right-2 text-[10px] font-mono-code text-[#ffd700] bg-[#1a120b]/80 px-1.5 rounded border border-[#6b5235]">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Difficulty selection */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#ffd700] text-lg">⚔️</span>
            <h2 className="text-sm font-bold font-cinzel text-[#ffd700] tracking-wider">选择考验 · DIFFICULTY</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => {
              const cfg = DIFFICULTY_CONFIG[d];
              const sel = difficulty === d;
              const colorMap: Record<Difficulty, string> = {
                novice: 'from-[#3a6b4a]/40 to-[#1a2a1b]/60 border-[#6ab97a]',
                adept: 'from-[#7a6b3a]/40 to-[#2a2010]/60 border-[#c4a85c]',
                archmage: 'from-[#8a3520]/40 to-[#2a1010]/60 border-[#d34a26]',
              };
              return (
                <button
                  key={d}
                  onClick={() => {
                    soundManager.playClick();
                    setDifficulty(d);
                  }}
                  className={`relative p-3 rounded-2xl bg-gradient-to-br ${colorMap[d]} border-2 text-left transition-all ${
                    sel ? 'ring-2 ring-[#ffd700] shadow-lg -translate-y-0.5' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="font-cinzel font-bold text-sm text-[#fff5e1]">{cfg.label}</div>
                  <div className="text-[11px] text-[#d6c4a6] leading-snug mt-1">{cfg.description}</div>
                  {sel && (
                    <div className="absolute top-2 right-2 text-[10px] font-mono-code text-[#ffd700] bg-[#1a120b]/80 px-1.5 rounded border border-[#6b5235]">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Endless mode toggle */}
        <section>
          <button
            onClick={() => {
              soundManager.playClick();
              setEndless((v) => !v);
            }}
            className={`w-full p-3 rounded-2xl border-2 flex items-center gap-3 transition-all ${
              endless
                ? 'bg-gradient-to-r from-[#5a3a8b]/40 to-[#2a1a3b]/60 border-[#9a5abb] ring-2 ring-[#b388ff]'
                : 'bg-[#1a1510]/70 border-[#634f35] hover:border-[#a3824f]'
            }`}
          >
            <InfinityIcon size={22} className={endless ? 'text-[#b388ff]' : 'text-[#8c7457]'} />
            <div className="text-left flex-1">
              <div className="font-cinzel font-bold text-sm text-[#fff5e1]">无尽模式 · Endless Survival</div>
              <div className="text-[11px] text-[#d6c4a6]">完成 20 波后继续迎击，直至核心陨落；享受无尽资源奖励加成。</div>
            </div>
            <div className={`text-xl ${endless ? 'text-[#b388ff]' : 'text-[#5c4a35]'}`}>
              {endless ? '✓' : '○'}
            </div>
          </button>
        </section>

        {/* Profile summary + achievements */}
        <section className="border-t border-[#634f35] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-[#ffd700]" />
              <span className="text-xs font-cinzel font-bold text-[#ffd700] tracking-wider">
                战绩 · CAREER
              </span>
            </div>
            <button
              onClick={() => {
                soundManager.playClick();
                setShowAchievements((v) => !v);
              }}
              className="text-[11px] text-[#d4af37] hover:text-[#ffd700] underline"
            >
              {showAchievements ? '收起' : `成就 ${unlockedCount}/${totalAch}`}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            <Stat label="胜场" value={profile.totalVictories} />
            <Stat label="最高波次" value={profile.highestWaveEver} />
            <Stat label="屠魔首领" value={profile.bossesSlainTotal} />
            <Stat label="总分" value={profile.totalScore} />
          </div>

          {showAchievements && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = profile.unlockedAchievements.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`flex items-start gap-2 p-2 rounded-xl border ${
                      unlocked
                        ? 'bg-[#3a2a14]/60 border-[#a3824f]'
                        : 'bg-[#1a1510]/60 border-[#3d3022] opacity-60'
                    }`}
                  >
                    <div className={`text-2xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-cinzel font-bold ${unlocked ? 'text-[#ffd700]' : 'text-[#8c7457]'}`}>
                        {a.name}
                      </div>
                      <div className="text-[10px] text-[#b39e82] leading-snug">{a.description}</div>
                    </div>
                    {unlocked && <div className="text-[#ffd700] text-xs">✓</div>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Action buttons */}
        <div className="flex flex-col md:flex-row gap-2 mt-2">
          <button
            onClick={() => {
              soundManager.playWarHorn();
              onStart({ biome, difficulty, endlessMode: endless });
            }}
            className="brass-button flex-1 py-3 px-5 rounded-xl text-base font-bold font-cinzel flex items-center justify-center gap-2 animate-pulse"
          >
            <Sparkles size={18} />
            <span>开启征程 · BEGIN</span>
          </button>
          <button
            onClick={() => {
              soundManager.playWarHorn();
              // Daily challenge: seeded run, fixed biome rotation, adept difficulty, no endless
              const today = new Date();
              const biomes: ('alpine' | 'volcano' | 'marsh' | 'crystal_abyss')[] = ['alpine', 'volcano', 'marsh', 'crystal_abyss'];
              const seedBiome = biomes[Math.floor(today.getDate() / 8) % 4];
              const seed = `daily-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              onStart({ biome: seedBiome, difficulty: 'adept', endlessMode: false, dailySeed: seed });
            }}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#5a3a8b]/40 to-[#2a1a3b]/60 border-2 border-[#9a5abb] text-[#b388ff] hover:text-[#fff] hover:border-[#d4af37] transition-all flex items-center justify-center gap-2 text-sm font-cinzel font-bold"
            title="每日固定场景的挑战，全球玩家相同地图！"
          >
            <Calendar size={16} />
            <span>每日挑战</span>
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenCodex();
            }}
            className="px-4 py-3 rounded-xl bg-[#33251a] border border-[#6b4f2c] text-[#e0cfb3] hover:bg-[#443422] hover:text-[#ffd700] transition-colors flex items-center justify-center gap-2 text-sm font-cinzel"
          >
            <HelpCircle size={16} />
            <span>查阅图鉴</span>
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setShowHelp(true);
            }}
            className="px-4 py-3 rounded-xl bg-[#33251a] border border-[#6b4f2c] text-[#e0cfb3] hover:bg-[#443422] hover:text-[#ffd700] transition-colors flex items-center justify-center gap-2 text-sm font-cinzel"
          >
            <HelpCircle size={16} />
            <span>玩法说明</span>
          </button>
        </div>

        {/* Footer hints */}
        <div className="text-center text-[10px] text-[#7c6241] mt-1 font-cinzel tracking-wider">
          快捷键: 空格 暂停 · Q-X 地貌工具 · 1-8 选塔 · Esc 取消 · H 显示快捷键面板
        </div>

        {/* Help modal */}
        {showHelp && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowHelp(false)}>
            <div className="parchment-panel p-5 rounded-2xl max-w-md text-sm text-[#ecdcb9]" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-cinzel text-[#ffd700] mb-2">游戏说明</h3>
              <ul className="text-xs space-y-1 text-[#c7b299]">
                <li>• 吹响号角开始波次；击退所有魔物即可获胜。</li>
                <li>• 选中防御塔后在地块上点击构筑；高处射程更远。</li>
                <li>• 用地貌工具升降地形、引水引岩改变魔物路线。</li>
                <li>• 每波结束三选一秘宝，永久改变战局走向。</li>
              </ul>
              <button onClick={() => setShowHelp(false)} className="brass-button mt-4 py-1 px-4 rounded-lg text-xs">
                知道了
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="parchment-card rounded-xl py-2 px-1 border border-[#634f35]">
    <div className="text-[10px] text-[#aa9578] font-cinzel uppercase tracking-wider">{label}</div>
    <div className="text-lg font-bold font-mono-code text-[#ffd580]">{value.toLocaleString()}</div>
  </div>
);
