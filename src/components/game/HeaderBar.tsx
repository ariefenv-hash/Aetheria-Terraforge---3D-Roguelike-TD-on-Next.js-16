import React from 'react';
import { BookOpen, FastForward, MapPin, Pause, Play, RotateCcw, Save, Volume2, VolumeX, Eye } from 'lucide-react';
import { Resources, WeatherType } from '@/types/game';
import { WEATHER_CONFIGS } from '@/game/gameData';
import { soundManager } from '@/audio/soundManager';

interface HeaderBarProps {
  resources: Resources;
  heartHealth: number;
  maxHeartHealth: number;
  currentWave: number;
  totalWaves: number;
  isWaveInProgress: boolean;
  isPaused: boolean;
  gameSpeed: number;
  currentWeather: WeatherType;
  nextWeather: WeatherType;
  isMuted: boolean;
  onTogglePause: () => void;
  onCycleSpeed: () => void;
  onStartWave: () => void;
  onOpenCodex: () => void;
  onOpenEditor: () => void;
  onOpenSaves: () => void;
  onToggleMute: () => void;
  onResetCamera: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  resources,
  heartHealth,
  maxHeartHealth,
  currentWave,
  totalWaves,
  isWaveInProgress,
  isPaused,
  gameSpeed,
  currentWeather,
  nextWeather,
  isMuted,
  onTogglePause,
  onCycleSpeed,
  onStartWave,
  onOpenCodex,
  onOpenEditor,
  onOpenSaves,
  onToggleMute,
  onResetCamera,
}) => {
  const weatherCfg = WEATHER_CONFIGS[currentWeather];
  const nextWeatherCfg = WEATHER_CONFIGS[nextWeather];
  const healthPercent = Math.max(0, Math.min(100, (heartHealth / maxHeartHealth) * 100));

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-2 md:p-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left: Heart Core & Map Title */}
        <div className="pointer-events-auto flex items-center gap-3 parchment-card px-3 py-1.5 rounded-lg border border-[#8b6f4e]">
          {/* Heart Health Orb */}
          <div className="relative flex items-center gap-2">
            <div className="relative w-10 h-10 rounded-full flex items-center justify-center bg-[#20150e] border-2 border-[#b8860b] shadow-inner">
              <span className="text-xl">💎</span>
              {/* Health Ring SVG */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  stroke="#3a2216"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  stroke={healthPercent > 40 ? '#e6a838' : '#e63946'}
                  strokeWidth="3"
                  strokeDasharray="106.8"
                  strokeDashoffset={106.8 - (106.8 * healthPercent) / 100}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-300"
                />
              </svg>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-[#cfb087] font-cinzel font-bold">
                地脉核心 (Core)
              </div>
              <div className="text-sm font-bold font-mono-code text-[#ffebcc]">
                {Math.round(heartHealth)} / {maxHeartHealth}
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-[#614e36]" />

          {/* Wave Number */}
          <div className="text-center px-1">
            <div className="text-[10px] uppercase text-[#a89070] font-cinzel">防御波次</div>
            <div className="text-base font-bold font-cinzel text-[#ffd700]">
              {currentWave} <span className="text-xs text-[#8c7457]">/ {totalWaves}</span>
            </div>
          </div>
        </div>

        {/* Center: Multi-Dimensional Resources */}
        <div className="pointer-events-auto flex items-center gap-2 md:gap-4 parchment-card px-3 py-1.5 rounded-lg border border-[#8b6f4e]">
          {/* Earth Aether */}
          <div className="flex items-center gap-1.5" title="地脉原石: 用于构筑防御工事与重塑地貌">
            <span className="text-lg">🪨</span>
            <div>
              <div className="text-[10px] text-[#aa9578] font-cinzel">原石</div>
              <div className="text-sm font-bold font-mono-code text-[#ffd580]">{resources.aether}</div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#53412c]" />

          {/* Mana */}
          <div className="flex items-center gap-1.5" title="灵脉能量: 驱动奥术棱镜与特殊法术">
            <span className="text-lg">⚡</span>
            <div>
              <div className="text-[10px] text-[#aa9578] font-cinzel">灵能</div>
              <div className="text-sm font-bold font-mono-code text-[#70d6ff]">{resources.mana}</div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#53412c]" />

          {/* Sparks */}
          <div className="flex items-center gap-1.5" title="造物印记: 重塑高山与开凿深渊的核心消耗点数">
            <span className="text-lg">🔨</span>
            <div>
              <div className="text-[10px] text-[#aa9578] font-cinzel">造物印记</div>
              <div className="text-sm font-bold font-mono-code text-[#ff9f1c]">{resources.sparks}</div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#53412c]" />

          {/* Ember Souls */}
          <div className="flex items-center gap-1.5" title="余烬魂髓: 击杀魔物获取，用于解锁Roguelike先祖秘宝">
            <span className="text-lg">🔮</span>
            <div>
              <div className="text-[10px] text-[#aa9578] font-cinzel">魂髓</div>
              <div className="text-sm font-bold font-mono-code text-[#e0aaff]">{resources.souls}</div>
            </div>
          </div>
        </div>

        {/* Right: Weather Barometer & Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Weather Glass */}
          <div
            className="parchment-card px-2.5 py-1.5 rounded-lg border border-[#8b6f4e] flex items-center gap-2 cursor-pointer hover:border-[#d4a359] transition-colors"
            title={`${weatherCfg.name}: ${weatherCfg.desc}\n下波预报: ${nextWeatherCfg.name}`}
            onClick={onOpenCodex}
          >
            <span className="text-xl animate-pulse">{weatherCfg.icon}</span>
            <div className="hidden sm:block text-left">
              <div className="text-[10px] text-[#a89070] font-cinzel">天候纪事</div>
              <div className="text-xs font-semibold text-[#f7e4be]">{weatherCfg.name.split(' ')[0]}</div>
            </div>
            <div className="text-[10px] px-1.5 py-0.5 rounded bg-[#33251a] text-[#d4af37] border border-[#6b4f2c]">
              下一天候: {nextWeatherCfg.icon}
            </div>
          </div>

          {/* Wave Start or Speed Toggle */}
          {!isWaveInProgress ? (
            <button
              onClick={() => {
                soundManager.playWarHorn();
                onStartWave();
              }}
              className="brass-button px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-bold font-cinzel animate-bounce"
            >
              <Play size={16} fill="currentColor" />
              <span>吹响号角</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 parchment-card p-1 rounded-lg border border-[#8b6f4e]">
              <button
                onClick={onTogglePause}
                className="p-1.5 rounded hover:bg-[#443422] text-[#f7e4be] transition-colors"
                title={isPaused ? '继续' : '暂停'}
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
              </button>
              <button
                onClick={onCycleSpeed}
                className="px-2 py-1 rounded hover:bg-[#443422] text-xs font-bold font-mono-code text-[#ffd700] transition-colors flex items-center gap-1"
                title="切换游戏速度 (1x / 2x / 4x)"
              >
                <FastForward size={14} />
                <span>{gameSpeed}x</span>
              </button>
            </div>
          )}

          {/* Menu / Tool Icons */}
          <div className="flex items-center gap-1 parchment-card p-1 rounded-lg border border-[#8b6f4e]">
            <button
              onClick={onResetCamera}
              className="p-1.5 rounded hover:bg-[#443422] text-[#e0cfb3] transition-colors"
              title="重置视角 (复位正等轴视角)"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={onOpenCodex}
              className="p-1.5 rounded hover:bg-[#443422] text-[#e0cfb3] transition-colors"
              title="古老图鉴与兵书 (Codex)"
            >
              <BookOpen size={16} />
            </button>
            <button
              onClick={onOpenEditor}
              className="p-1.5 rounded hover:bg-[#443422] text-[#e0cfb3] transition-colors"
              title="关卡工坊 (Level Editor)"
            >
              <MapPin size={16} />
            </button>
            <button
              onClick={onOpenSaves}
              className="p-1.5 rounded hover:bg-[#443422] text-[#e0cfb3] transition-colors"
              title="羊皮纸档案 (Save & Load)"
            >
              <Save size={16} />
            </button>
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded hover:bg-[#443422] text-[#e0cfb3] transition-colors"
              title={isMuted ? '解除静音' : '静音'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
