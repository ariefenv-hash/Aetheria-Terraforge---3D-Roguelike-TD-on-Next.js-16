import React, { useState } from 'react';
import { MapPin, Play, Download, Upload, Copy, Check, Mountain, Flame, Droplets, Sparkles, RefreshCw, X } from 'lucide-react';
import { GridTile, MapData, TerrainType } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface LevelEditorModalProps {
  isOpen: boolean;
  currentMap: MapData;
  onClose: () => void;
  onPlaytestMap: (mapData: MapData) => void;
}

export const LevelEditorModal: React.FC<LevelEditorModalProps> = ({
  isOpen,
  currentMap,
  onClose,
  onPlaytestMap,
}) => {
  const [mapWidth, setMapWidth] = useState(currentMap.width);
  const [mapDepth, setMapDepth] = useState(currentMap.depth);
  const [biome, setBiome] = useState<MapData['biome']>(currentMap.biome);
  const [title, setTitle] = useState(currentMap.title || '自定义要塞');
  const [description, setDescription] = useState(currentMap.description || '由建筑大师构筑的坚韧防线');

  // Copy of tiles for editing
  const [tiles, setTiles] = useState<GridTile[]>(() => JSON.parse(JSON.stringify(currentMap.tiles)));
  const [spawns, setSpawns] = useState(currentMap.spawns);
  const [heartCore, setHeartCore] = useState(currentMap.heartCore);

  // Brush tool
  const [activeBrush, setActiveBrush] = useState<
    | 'elevate'
    | 'lower'
    | 'paint_stone'
    | 'paint_water'
    | 'paint_lava'
    | 'paint_crystal'
    | 'set_spawn'
    | 'set_core'
  >('elevate');

  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  if (!isOpen) return null;

  const handleCellClick = (x: number, z: number) => {
    soundManager.playClick();
    const idx = z * mapWidth + x;
    const nextTiles = [...tiles];
    const tile = nextTiles[idx];
    if (!tile) return;

    if (activeBrush === 'elevate') {
      tile.height = Math.min(4, tile.height + 1);
    } else if (activeBrush === 'lower') {
      tile.height = Math.max(0, tile.height - 1);
      if (tile.height === 0) tile.type = 'water';
    } else if (activeBrush === 'paint_stone') {
      tile.type = 'stone';
    } else if (activeBrush === 'paint_water') {
      tile.type = 'water';
      tile.height = 0;
    } else if (activeBrush === 'paint_lava') {
      tile.type = 'lava';
      tile.height = 0;
    } else if (activeBrush === 'paint_crystal') {
      tile.hasCrystal = !tile.hasCrystal;
      tile.type = 'crystal';
    } else if (activeBrush === 'set_spawn') {
      // Toggle or set spawn
      setSpawns([{ x, z }]);
      tile.height = 1;
      tile.type = 'plains';
    } else if (activeBrush === 'set_core') {
      setHeartCore({ x, z });
      tile.height = 1;
      tile.type = 'stone';
    }

    setTiles(nextTiles);
  };

  const handleExport = () => {
    const exportData: MapData = {
      id: `custom_${Date.now()}`,
      title,
      description,
      width: mapWidth,
      depth: mapDepth,
      tiles,
      spawns,
      heartCore,
      initialAether: 200,
      initialMana: 80,
      initialSparks: 8,
      biome,
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    try {
      setImportError('');
      const parsed = JSON.parse(importText) as MapData;
      if (!parsed.tiles || !parsed.width || !parsed.depth) {
        throw new Error('无效的关卡地图数据格式');
      }
      setMapWidth(parsed.width);
      setMapDepth(parsed.depth);
      setBiome(parsed.biome || 'alpine');
      setTitle(parsed.title || '导入关卡');
      setDescription(parsed.description || '');
      setTiles(parsed.tiles);
      setSpawns(parsed.spawns || [{ x: 1, z: 1 }]);
      setHeartCore(parsed.heartCore || { x: parsed.width - 2, z: parsed.depth - 2 });
      soundManager.playBuild();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : '解析失败，请检查JSON文本');
    }
  };

  const handlePlaytest = () => {
    const testMap: MapData = {
      id: `playtest_${Date.now()}`,
      title,
      description,
      width: mapWidth,
      depth: mapDepth,
      tiles,
      spawns,
      heartCore,
      initialAether: 220,
      initialMana: 80,
      initialSparks: 8,
      biome,
    };
    onPlaytestMap(testMap);
    onClose();
  };

  const getTileColor = (tile: GridTile) => {
    if (tile.x === heartCore.x && tile.z === heartCore.z) return 'bg-[#ffd700] text-black font-bold';
    if (spawns.some((s) => s.x === tile.x && s.z === tile.z)) return 'bg-[#c9184a] text-white font-bold';

    if (tile.type === 'lava') return 'bg-[#d00000] text-white';
    if (tile.type === 'water') return 'bg-[#0077b6] text-white';
    if (tile.type === 'crystal') return 'bg-[#7209b7] text-white';

    switch (tile.height) {
      case 0:
        return 'bg-[#212529] text-[#6c757d]';
      case 1:
        return 'bg-[#588157] text-[#e9edc9]';
      case 2:
        return 'bg-[#a3b18a] text-[#344e41]';
      case 3:
        return 'bg-[#dda15e] text-[#283618]';
      case 4:
        return 'bg-[#bc6c25] text-white';
      default:
        return 'bg-[#588157]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 md:p-6 animate-in fade-in duration-200">
      <div className="max-w-5xl w-full h-[90vh] parchment-panel rounded-3xl border-2 border-[#997843] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b border-[#6e5336] flex items-center justify-between bg-[#1f1812]">
          <div className="flex items-center gap-2">
            <MapPin size={22} className="text-[#ffd700]" />
            <div>
              <h2 className="text-lg md:text-xl font-bold font-decorative text-[#fff0d0]">
                古代工部·关卡工坊 (Level Architect)
              </h2>
              <div className="text-xs text-[#a69279]">随心雕琢山川险隘，定义异界裂隙与地脉核心</div>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-[#3d2e1f] text-[#c9b79b] hover:text-[#ffd700]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Interactive Grid Canvas */}
          <div className="flex-1 p-4 overflow-auto flex flex-col items-center justify-center bg-[#100d0a] border-r border-[#4d3822]">
            <div
              className="grid gap-1 p-2 bg-[#1b1510] rounded-xl border-2 border-[#523e29] shadow-inner select-none"
              style={{
                gridTemplateColumns: `repeat(${mapWidth}, minmax(0, 1fr))`,
              }}
            >
              {tiles.map((tile) => {
                const isCore = tile.x === heartCore.x && tile.z === heartCore.z;
                const isSpawn = spawns.some((s) => s.x === tile.x && s.z === tile.z);

                return (
                  <button
                    key={`${tile.x}_${tile.z}`}
                    onClick={() => handleCellClick(tile.x, tile.z)}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded text-[10px] flex items-center justify-center transition-transform hover:scale-110 shadow-sm ${getTileColor(
                      tile
                    )}`}
                    title={`[${tile.x},${tile.z}] 高度:${tile.height} 类型:${tile.type}`}
                  >
                    {isCore ? '💎' : isSpawn ? '🌀' : tile.hasCrystal ? '✨' : tile.height}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-[#a89070]">
              <span className="flex items-center gap-1">💎 地脉核心</span>
              <span className="flex items-center gap-1">🌀 裂隙传送门</span>
              <span className="flex items-center gap-1">✨ 源石脉</span>
              <span>数字表示地形高度 (0-4)</span>
            </div>
          </div>

          {/* Right: Brush Palette & Config */}
          <div className="w-full md:w-80 p-4 overflow-y-auto flex flex-col gap-4 bg-[#1a140e]">
            {/* Title & Biome */}
            <div className="space-y-2">
              <label className="text-xs font-cinzel font-bold text-[#ffd700]">关卡称号与环境</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#120d09] border border-[#523e29] rounded-lg px-2.5 py-1.5 text-xs text-[#fff0d0] font-cinzel"
              />
              <select
                value={biome}
                onChange={(e) => setBiome(e.target.value as MapData['biome'])}
                className="w-full bg-[#120d09] border border-[#523e29] rounded-lg px-2.5 py-1.5 text-xs text-[#ffd700] font-cinzel"
              >
                <option value="alpine">高山要塞 (Alpine Citadel)</option>
                <option value="volcano">熔岩破火山口 (Volcanic Caldera)</option>
                <option value="marsh">低地死寂沼泽 (Misty Fenlands)</option>
                <option value="crystal_abyss">群星源石深渊 (Crystal Abyss)</option>
              </select>
            </div>

            {/* Brush Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-cinzel font-bold text-[#ffd700]">雕塑画笔工具</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'elevate', label: '隆起高台 (+1)', icon: <Mountain size={14} /> },
                  { id: 'lower', label: '深凿地沟 (-1)', icon: <Mountain size={14} className="rotate-180" /> },
                  { id: 'paint_stone', label: '铺设岩石', icon: <span>🪨</span> },
                  { id: 'paint_water', label: '注入水流', icon: <Droplets size={14} /> },
                  { id: 'paint_lava', label: '引流熔岩', icon: <Flame size={14} /> },
                  { id: 'paint_crystal', label: '植入源石脉', icon: <Sparkles size={14} /> },
                  { id: 'set_spawn', label: '安放传送门', icon: <span>🌀</span> },
                  { id: 'set_core', label: '设定核心', icon: <span>💎</span> },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      soundManager.playClick();
                      setActiveBrush(b.id as typeof activeBrush);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-cinzel flex items-center gap-1.5 border transition-all ${
                      activeBrush === b.id
                        ? 'bg-[#5e4326] border-[#ffd700] text-[#fff5e1] font-bold shadow-md'
                        : 'bg-[#221a13] border-[#523e29] text-[#c9b79b] hover:border-[#8c6d48]'
                    }`}
                  >
                    {b.icon}
                    <span>{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-[#4d3822] flex flex-col gap-2">
              <button
                onClick={handlePlaytest}
                className="brass-button py-2.5 px-4 rounded-xl text-xs font-bold font-cinzel flex items-center justify-center gap-2 shadow-lg"
              >
                <Play size={16} fill="currentColor" />
                <span>立即以此关卡实机开战！</span>
              </button>

              <button
                onClick={handleExport}
                className="py-2 px-3 rounded-xl border border-[#7a5e3d] bg-[#2a1f16] hover:bg-[#382b1d] text-xs font-cinzel text-[#ffd700] flex items-center justify-center gap-1.5"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? '已复制关卡数据至剪贴板！' : '导出关卡蓝图 (JSON)'}</span>
              </button>
            </div>

            {/* Import Area */}
            <div className="pt-2 border-t border-[#4d3822] space-y-1.5">
              <label className="text-[11px] font-cinzel text-[#aa9577]">导入社区或好友关卡代码</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="粘贴关卡 JSON 代码于此..."
                rows={2}
                className="w-full bg-[#120d09] border border-[#523e29] rounded-lg p-2 text-[10px] font-mono-code text-[#fff0d0] resize-none"
              />
              {importError && <div className="text-[10px] text-[#ff8080]">{importError}</div>}
              <button
                onClick={handleImport}
                className="w-full py-1.5 px-3 rounded-lg border border-[#523e29] bg-[#221a13] hover:bg-[#33251a] text-xs font-cinzel text-[#c9b79b] hover:text-[#ffd700] flex items-center justify-center gap-1"
              >
                <Upload size={14} />
                <span>载入蓝图</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
