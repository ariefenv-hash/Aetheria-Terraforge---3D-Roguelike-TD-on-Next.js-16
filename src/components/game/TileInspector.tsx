import React from 'react';
import { ArrowUpCircle, Trash2, Crosshair, Shield, Mountain } from 'lucide-react';
import { GridTile, PlacedTower } from '@/types/game';
import { TOWER_CONFIGS } from '@/game/gameData';
import { soundManager } from '@/audio/soundManager';

interface TileInspectorProps {
  tile: GridTile | null;
  tower: PlacedTower | null;
  aether: number;
  onUpgradeTower: (towerId: string) => void;
  onSellTower: (towerId: string) => void;
  onChangeTargetMode: (towerId: string, mode: PlacedTower['targetMode']) => void;
  onClose: () => void;
}

export const TileInspector: React.FC<TileInspectorProps> = ({
  tile,
  tower,
  aether,
  onUpgradeTower,
  onSellTower,
  onChangeTargetMode,
  onClose,
}) => {
  if (!tile) return null;

  const towerCfg = tower ? TOWER_CONFIGS[tower.type] : null;
  const upgradeCost = tower && towerCfg ? Math.round(towerCfg.cost.aether * 0.8 * tower.level) : 0;
  const sellRefund = tower && towerCfg ? Math.round(towerCfg.cost.aether * 0.65 * tower.level) : 0;
  const canAffordUpgrade = aether >= upgradeCost;

  const getHeightLabel = (h: number) => {
    switch (h) {
      case 0:
        return '深渊断层 / 沟壑 (0层)';
      case 1:
        return '平原基层 (1层)';
      case 2:
        return '耸立丘陵 (2层 · 射程+25%)';
      case 3:
        return '悬崖高台 (3层 · 射程+50%)';
      case 4:
        return '绝巅峰顶 (4层 · 射程+75%)';
      default:
        return `${h} 层`;
    }
  };

  const getTerrainName = (type: string) => {
    switch (type) {
      case 'stone':
        return '花岗岩石基';
      case 'water':
        return '灵脉清泉 (雷雨传导)';
      case 'lava':
        return '灼热熔岩 (高温焚敌)';
      case 'crystal':
        return '地脉源石脉 (开采翻倍)';
      case 'chasm':
        return '无底裂隙 (绝对阻隔)';
      case 'mud':
        return '泥泞软地 (强效迟滞)';
      default:
        return '厚土平原';
    }
  };

  return (
    <div className="absolute right-2 md:right-4 top-20 z-20 pointer-events-auto max-w-[280px] w-full">
      <div className="parchment-panel p-3 rounded-2xl border border-[#997843] shadow-2xl backdrop-blur-md flex flex-col gap-2.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#634f35] pb-1.5">
          <div className="flex items-center gap-1.5">
            <Mountain size={16} className="text-[#ffd700]" />
            <span className="text-xs font-bold font-cinzel text-[#ffd700]">地块勘探档案</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#a89070] hover:text-[#ffd700] px-1.5 rounded hover:bg-[#33251a]"
          >
            ✕
          </button>
        </div>

        {/* Tile Elevation & Details */}
        <div className="bg-[#1c1510]/80 p-2 rounded-xl border border-[#52402b] flex flex-col gap-1 text-xs">
          <div className="flex justify-between items-center text-[#cbbba2]">
            <span>坐标方位:</span>
            <span className="font-mono-code font-bold text-[#f7e4be]">
              [{tile.x}, {tile.z}]
            </span>
          </div>
          <div className="flex justify-between items-center text-[#cbbba2]">
            <span>高程阶梯:</span>
            <span className="font-mono-code font-bold text-[#ffb703]">{getHeightLabel(tile.height)}</span>
          </div>
          <div className="flex justify-between items-center text-[#cbbba2]">
            <span>地质类型:</span>
            <span className="font-medium text-[#ffd166]">{getTerrainName(tile.type)}</span>
          </div>
          {tile.hasCrystal && (
            <div className="text-[10px] text-[#b388ff] font-bold flex items-center gap-1 mt-0.5">
              <span>💎</span> 探明高纯度源石晶簇 (采矿收益+120%)
            </div>
          )}
        </div>

        {/* Placed Tower Section */}
        {tower && towerCfg ? (
          <div className="flex flex-col gap-2">
            <div className="bg-[#241a12] p-2.5 rounded-xl border border-[#7a5c36]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-cinzel text-[#ffd700]">
                  {towerCfg.name.split(' ')[0]}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#4d3721] text-[#ffd700] border border-[#8a683e] font-mono-code font-bold">
                  Lv.{tower.level}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-1 my-2 text-[11px] text-[#d4c3a3]">
                <div>
                  伤害: <span className="font-mono-code text-[#ffd700]">{towerCfg.damage * tower.level}</span>
                </div>
                <div>
                  射程:{' '}
                  <span className="font-mono-code text-[#70d6ff]">
                    {(towerCfg.range + Math.max(0, tile.height - 1) * towerCfg.elevationBonusRange).toFixed(1)}
                  </span>
                </div>
                <div>
                  歼敌: <span className="font-mono-code text-[#f28482]">{tower.totalKills}</span>
                </div>
                <div>
                  总伤: <span className="font-mono-code text-[#f28482]">{Math.round(tower.totalDamageDealt)}</span>
                </div>
              </div>

              {/* Targeting Mode Dropdown */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#4d3721]">
                <span className="text-[#a89070] flex items-center gap-1">
                  <Crosshair size={12} /> 索敌逻辑:
                </span>
                <select
                  value={tower.targetMode}
                  onChange={(e) => onChangeTargetMode(tower.id, e.target.value as PlacedTower['targetMode'])}
                  className="bg-[#17110c] text-[#ffd700] border border-[#6b4f2c] rounded px-1.5 py-0.5 text-xs font-cinzel"
                >
                  <option value="first">首位入侵者</option>
                  <option value="strongest">最高生命值</option>
                  <option value="closest">距核心最近</option>
                  <option value="flying">优先防空</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                disabled={!canAffordUpgrade}
                onClick={() => {
                  soundManager.playBuild();
                  onUpgradeTower(tower.id);
                }}
                className="flex-1 brass-button py-1.5 px-2 rounded-xl text-xs font-bold font-cinzel flex items-center justify-center gap-1"
                title={`花费 ${upgradeCost} 原石升级`}
              >
                <ArrowUpCircle size={14} />
                <span>升级 ({upgradeCost}🪨)</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playBuild();
                  onSellTower(tower.id);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-[#802b2b] bg-[#3a1414] hover:bg-[#521b1b] text-[#ff9999] text-xs font-cinzel flex items-center justify-center gap-1"
                title={`拆除并返还 ${sellRefund} 原石`}
              >
                <Trash2 size={13} />
                <span>回收</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-[#998165] text-center py-2 italic border border-dashed border-[#57432b] rounded-xl">
            此地块尚未构筑防御工事，可由下方工械栏选配建造。
          </div>
        )}
      </div>
    </div>
  );
};
