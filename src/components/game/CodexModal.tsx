import React, { useState } from 'react';
import { BookOpen, Mountain, Shield, CloudRain, Skull, X } from 'lucide-react';
import { TOWER_CONFIGS, ENEMY_CONFIGS, WEATHER_CONFIGS, RELIC_POOL } from '@/game/gameData';
import { soundManager } from '@/audio/soundManager';

interface CodexModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodexModal: React.FC<CodexModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'terra' | 'towers' | 'weather' | 'enemies' | 'relics'>('terra');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-6 animate-in fade-in duration-200">
      <div className="max-w-4xl w-full h-[85vh] parchment-panel rounded-3xl border-2 border-[#997843] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#6e5336] flex items-center justify-between bg-[#1f1812]">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-[#ffd700]" />
            <h2 className="text-lg md:text-xl font-bold font-decorative text-[#fff0d0]">
              《地脉筑城秘典》· 古老手稿图鉴
            </h2>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-[#3d2e1f] text-[#c9b79b] hover:text-[#ffd700] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#5e472e] bg-[#17110c] px-4 gap-2 overflow-x-auto">
          {[
            { id: 'terra', label: '重塑兵法', icon: <Mountain size={15} /> },
            { id: 'towers', label: '防御工械', icon: <Shield size={15} /> },
            { id: 'weather', label: '天候异象', icon: <CloudRain size={15} /> },
            { id: 'enemies', label: '异界魔物', icon: <Skull size={15} /> },
            { id: 'relics', label: '先民秘宝', icon: <span>💎</span> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                soundManager.playClick();
                setActiveTab(tab.id as typeof activeTab);
              }}
              className={`py-2.5 px-3 font-cinzel text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#ffd700] text-[#ffd700] bg-[#291d14]'
                  : 'border-transparent text-[#a69279] hover:text-[#e8d7be]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 text-sm text-[#ebdcb9] space-y-4">
          {/* TAB 1: TERRAFORMING */}
          {activeTab === 'terra' && (
            <div className="space-y-4">
              <div className="parchment-card p-4 rounded-xl border border-[#7a5e3d]">
                <h3 className="text-base font-bold font-cinzel text-[#ffd700] mb-1">
                  一、居高临下：高程与射界法度 (Elevation Mechanics)
                </h3>
                <p className="text-xs text-[#d1c0a5] leading-relaxed">
                  战场网格共划分为 0 至 4 五级高程。将防御塔构筑于更高山峦之上，将依据高度差赋予强大的**射程加成**（每级增加 20%~35%）与**杀伤增幅**，且高台射手可无视低洼障碍遮挡！
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
                  <div className="p-2.5 rounded bg-[#1c1510] border border-[#523e29]">
                    <div className="font-bold text-[#ffd700]">⛰️ 1层 平原基台</div>
                    <div className="text-[11px] text-[#9e8b75]">标准平坦地形，无额外加成</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#1c1510] border border-[#523e29]">
                    <div className="font-bold text-[#ffd700]">⛰️ 2-3层 耸立丘陵与高台</div>
                    <div className="text-[11px] text-[#9e8b75]">获得大幅射程扩张，步兵攀爬仰攻减速 40%</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#1c1510] border border-[#523e29]">
                    <div className="font-bold text-[#ffd700]">⛰️ 4层 绝巅峰顶</div>
                    <div className="text-[11px] text-[#9e8b75]">超视距打击，投石机与弩炮贯穿伤害极致</div>
                  </div>
                </div>
              </div>

              <div className="parchment-card p-4 rounded-xl border border-[#7a5e3d]">
                <h3 className="text-base font-bold font-cinzel text-[#ffd700] mb-1">
                  二、开凿断堑与路径逼迫 (Chokepoint & Pathing)
                </h3>
                <p className="text-xs text-[#d1c0a5] leading-relaxed">
                  地面魔物严格依照 A* 寻路法则行进。利用【隆起山峦】制造悬崖（高差大于等于2不可攀越）或【深渊天堑】切断直线路经，可逼迫魔物在弯曲盘旋的迷宫防线中承受漫长轰炸！
                </p>
              </div>

              <div className="parchment-card p-4 rounded-xl border border-[#7a5e3d]">
                <h3 className="text-base font-bold font-cinzel text-[#ffd700] mb-1">
                  三、熔岩与涌泉灌注 (Elemental Hazard Trenches)
                </h3>
                <p className="text-xs text-[#d1c0a5] leading-relaxed">
                  在开凿至0层的地沟中灌注【熔岩】，会对踏入者造成持续灼烧；而灌注【灵脉清泉】，则可在雷暴天气降临时触发全线雷电连锁打击，将进入水域的成群敌人瞬间瘫痪！
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: TOWERS */}
          {activeTab === 'towers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(TOWER_CONFIGS).map((t) => (
                <div key={t.type} className="parchment-card p-3 rounded-xl border border-[#6b5235]">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold font-cinzel text-[#ffd700] text-sm">{t.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#332214] text-[#ffd580] border border-[#694827] font-mono-code">
                      {t.cost.aether}🪨 {t.cost.mana > 0 && `${t.cost.mana}⚡`}
                    </span>
                  </div>
                  <p className="text-xs text-[#c9b89f] mt-1.5 leading-relaxed">{t.description}</p>
                  <div className="flex gap-4 mt-2 text-[11px] font-mono-code text-[#aa9577] border-t border-[#4a3926] pt-1.5">
                    <span>基础伤害: {t.damage}</span>
                    <span>基础射程: {t.range.toFixed(1)}</span>
                    <span>高台射程加成: +{t.elevationBonusRange}/层</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: WEATHER */}
          {activeTab === 'weather' && (
            <div className="space-y-3">
              {Object.entries(WEATHER_CONFIGS).map(([key, w]) => (
                <div key={key} className="parchment-card p-3.5 rounded-xl border border-[#6e5336] flex items-start gap-3">
                  <div className="text-3xl p-2 rounded-xl bg-[#1c1510] border border-[#523e29]">{w.icon}</div>
                  <div>
                    <h4 className="font-bold font-cinzel text-[#ffd700] text-sm">{w.name}</h4>
                    <p className="text-xs text-[#c9b89f] mt-1 leading-relaxed">{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: ENEMIES */}
          {activeTab === 'enemies' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(ENEMY_CONFIGS).map((e) => (
                <div key={e.type} className="parchment-card p-3 rounded-xl border border-[#6b5235]">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold font-cinzel text-[#ff9999] text-sm">{e.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#331414] text-[#ffb3b3] border border-[#662828] font-mono-code">
                      {e.isFlying ? '🦅 飞行单位' : '🐾 地面魔物'}
                    </span>
                  </div>
                  <p className="text-xs text-[#c9b89f] mt-1 leading-relaxed">{e.description}</p>
                  <div className="flex gap-4 mt-2 text-[11px] font-mono-code text-[#aa9577] border-t border-[#4a3926] pt-1.5">
                    <span>基础生命: {e.maxHealth}</span>
                    <span>移速: {e.speed}</span>
                    <span>护甲减伤: {Math.round(e.armor * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: RELICS */}
          {activeTab === 'relics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RELIC_POOL.map((r) => (
                <div key={r.id} className="parchment-card p-3 rounded-xl border border-[#6b5235] flex items-start gap-2.5">
                  <span className="text-2xl p-1.5 bg-[#17110c] rounded-lg border border-[#523e29]">{r.icon}</span>
                  <div>
                    <h4 className="font-bold font-cinzel text-[#ffd700] text-xs">{r.name}</h4>
                    <p className="text-[11px] text-[#c9b89f] mt-0.5">{r.description}</p>
                    <div className="text-[10px] text-[#8c7457] italic mt-1 font-serif">{r.flavor}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
