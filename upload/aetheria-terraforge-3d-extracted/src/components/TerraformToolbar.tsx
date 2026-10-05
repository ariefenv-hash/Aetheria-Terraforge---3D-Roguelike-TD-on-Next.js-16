import React from 'react';
import { Compass, Flame, Droplets, Mountain, ArrowDownFromLine, Ban, Hammer, MinusCircle } from 'lucide-react';
import { TerraformTool } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface TerraformToolbarProps {
  currentTool: TerraformTool;
  onSelectTool: (tool: TerraformTool) => void;
  sparks: number;
  aether: number;
}

export const TerraformToolbar: React.FC<TerraformToolbarProps> = ({
  currentTool,
  onSelectTool,
  sparks,
  aether,
}) => {
  const tools: {
    id: TerraformTool;
    name: string;
    subname: string;
    icon: React.ReactNode;
    costText: string;
    desc: string;
    hotkey: string;
  }[] = [
    {
      id: 'inspect',
      name: '勘探视界',
      subname: 'Inspect',
      icon: <Compass size={18} />,
      costText: '免费',
      desc: '勘探地块高程、射击盲区与驻防工事属性',
      hotkey: 'Q',
    },
    {
      id: 'elevate',
      name: '隆起山峦',
      subname: '+1 高度',
      icon: <Mountain size={18} />,
      costText: '1 🔨 / 20 🪨',
      desc: '升起地表！赋予哨塔超视距射程加成，阻断低处魔物攀爬',
      hotkey: 'W',
    },
    {
      id: 'lower',
      name: '开凿地沟',
      subname: '-1 高度',
      icon: <ArrowDownFromLine size={18} />,
      costText: '1 🔨 / 15 🪨',
      desc: '向下削减地表。减缓魔物移动速度，可引导液体流动',
      hotkey: 'E',
    },
    {
      id: 'chasm',
      name: '深渊天堑',
      subname: '0层 断崖',
      icon: <Ban size={18} />,
      costText: '2 🔨 / 35 🪨',
      desc: '直接挖至深渊断崖！地面魔物完全无法通行，逼其绕行',
      hotkey: 'R',
    },
    {
      id: 'channel_lava',
      name: '熔岩灌注',
      subname: '赤炎陷阱',
      icon: <Flame size={18} />,
      costText: '1 🔨 / 25 🪨',
      desc: '点燃低洼地表为滚烫熔岩，持续灼烧踏入的魔物',
      hotkey: 'T',
    },
    {
      id: 'channel_water',
      name: '灵脉涌泉',
      subname: '导电水域',
      icon: <Droplets size={18} />,
      costText: '1 🔨 / 25 🪨',
      desc: '引来地脉涌泉。雷暴天气中可大范围传导雷击眩晕',
      hotkey: 'Y',
    },
    {
      id: 'flatten',
      name: '平整大地',
      subname: '恢复 1层',
      icon: <Hammer size={18} />,
      costText: '1 🔨 / 10 🪨',
      desc: '将地块恢复为标准的坚实平原基石',
      hotkey: 'U',
    },
    {
      id: 'demolish',
      name: '拆除工事',
      subname: '回收晶石',
      icon: <MinusCircle size={18} />,
      costText: '返还部分',
      desc: '拆除指定地块上的哨塔或障碍物，回收部分原石',
      hotkey: 'X',
    },
  ];

  return (
    <div className="absolute left-2 md:left-4 top-20 z-20 pointer-events-auto">
      <div className="parchment-panel p-2 rounded-xl border border-[#997843] flex flex-col gap-1.5 shadow-2xl backdrop-blur-sm max-w-[210px]">
        {/* Panel Header */}
        <div className="px-1.5 py-0.5 border-b border-[#695033] flex items-center justify-between">
          <div className="text-[11px] font-bold font-cinzel text-[#dfc39a] flex items-center gap-1">
            <span>⚙️</span> 地貌重塑法旨
          </div>
          <div className="text-[9px] text-[#aa9577] font-mono-code">TERRAFORGE</div>
        </div>

        {/* Tools List */}
        <div className="flex flex-col gap-1">
          {tools.map((t) => {
            const isSelected = currentTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  soundManager.playClick();
                  onSelectTool(t.id);
                }}
                className={`group text-left px-2 py-1.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#594127] to-[#362717] border-[#ffd700] text-[#fff7df] shadow-md ring-1 ring-[#ffd700]'
                    : 'bg-[#221a13]/80 border-[#57432b] text-[#d6c4a6] hover:bg-[#382b1d] hover:border-[#a8824f]'
                }`}
                title={`${t.name} (${t.desc})\n消耗: ${t.costText} [快捷键: ${t.hotkey}]`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`p-1 rounded ${
                      isSelected ? 'text-[#ffd700] bg-[#1a120b]' : 'text-[#c2a275] group-hover:text-[#ffd700]'
                    }`}
                  >
                    {t.icon}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold leading-tight font-cinzel truncate">{t.name}</div>
                    <div className="text-[10px] text-[#998165] leading-tight truncate">{t.subname}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[9px] font-mono-code font-bold text-[#e8b965]">{t.costText}</div>
                  <div className="text-[9px] font-mono-code text-[#735e46]">[{t.hotkey}]</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
