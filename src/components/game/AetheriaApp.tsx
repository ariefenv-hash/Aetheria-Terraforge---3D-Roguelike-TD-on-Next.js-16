'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeRenderer } from '@/game/threeRenderer';
import { GameState } from '@/game/gameState';
import { GridTile, MapData, PlacedTower, Relic, SaveGameSlot, TerraformTool, TowerType } from '@/types/game';
import { soundManager } from '@/audio/soundManager';
import { HeaderBar } from '@/components/game/HeaderBar';
import { TerraformToolbar } from '@/components/game/TerraformToolbar';
import { TowerBuildPanel } from '@/components/game/TowerBuildPanel';
import { TileInspector } from '@/components/game/TileInspector';
import { RelicDraftModal } from '@/components/game/RelicDraftModal';
import { CodexModal } from '@/components/game/CodexModal';
import { LevelEditorModal } from '@/components/game/LevelEditorModal';
import { SavesModal } from '@/components/game/SavesModal';
import { GameOverModal } from '@/components/game/GameOverModal';
import { TOWER_CONFIGS } from '@/game/gameData';

export default function AetheriaApp() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ThreeRenderer | null>(null);
  const gameStateRef = useRef<GameState | null>(null);

  // Reactive UI state
  const [tickCounter, setTickCounter] = useState(0);
  const [selectedTool, setSelectedTool] = useState<TerraformTool>('inspect');
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [inspectedTile, setInspectedTile] = useState<GridTile | null>(null);

  // Modals
  const [draftRelics, setDraftRelics] = useState<Relic[]>([]);
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSavesOpen, setIsSavesOpen] = useState(false);
  const [gameOverState, setGameOverState] = useState<{ open: boolean; victory: boolean }>({
    open: false,
    victory: false,
  });

  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // Initialize Game & 3D Renderer
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const game = new GameState();
    gameStateRef.current = game;

    const renderer = new ThreeRenderer(canvasContainerRef.current);
    rendererRef.current = renderer;

    // Load initial map
    renderer.buildTerrain(
      game.mapData.tiles,
      game.mapData.width,
      game.mapData.depth,
      game.mapData.spawns,
      game.mapData.heartCore,
      game.mapData.biome
    );
    renderer.setWeather(game.currentWeather);

    // Event hooks
    game.events = {
      onWaveComplete: () => {
        // Triggered on wave complete
      },
      onGameOver: (victory) => {
        setGameOverState({ open: true, victory });
      },
      onRelicDraftOpen: (relics) => {
        setDraftRelics(relics);
      },
      onStateUpdate: () => {},
    };

    // Tile click handler from 3D canvas
    renderer.onTileClick = (x: number, z: number) => {
      const g = gameStateRef.current;
      if (!g) return;

      const tile = g.getTile(x, z);
      if (!tile) return;

      // If building a tower
      if (g.selectedTowerToBuild) {
        const canBuild = g.buildTower(x, z, g.selectedTowerToBuild);
        if (canBuild) {
          renderer.updateTowers(g.placedTowers, g.mapData.tiles);
          showNotification(`成功构筑防御工事于 [${x}, ${z}]`);
          g.selectedTowerToBuild = null;
          setSelectedTower(null);
          renderer.hideRangePreview();
        } else {
          showNotification('无法在此地块建造 (资源不足或地基不稳)');
        }
        return;
      }

      // If terraforming
      if (g.selectedTool !== 'inspect') {
        const terraformed = g.applyTerraform(x, z, g.selectedTool);
        if (terraformed) {
          renderer.updateTile(tile, g.mapData.biome);
          showNotification(`地貌重塑成功: [${x}, ${z}]`);
        } else {
          showNotification('无法重塑该地块 (印记或原石不足)');
        }
        return;
      }

      // Default: inspect tile
      setInspectedTile({ ...tile });
    };

    // Tile hover handler (update range preview)
    renderer.onTileHover = (tile: GridTile | null) => {
      const g = gameStateRef.current;
      if (!g || !tile) {
        renderer.hideRangePreview();
        return;
      }

      if (g.selectedTowerToBuild) {
        const cfg = TOWER_CONFIGS[g.selectedTowerToBuild];
        const elevationBonus = Math.max(0, tile.height - 1) * cfg.elevationBonusRange;
        const totalRange = (cfg.range + elevationBonus) * g.gameModifiers.towerRangeMult[g.selectedTowerToBuild];
        renderer.setRangePreview(totalRange, tile.x, tile.z, tile.height);
      }
    };

    // Main animation loop
    let lastTime = performance.now();
    let animId: number;

    const loop = (currentTime: number) => {
      animId = requestAnimationFrame(loop);
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (game) {
        game.tick(dt);
        renderer.updateEnemies(game.activeEnemies);
        renderer.updateProjectiles(game.projectiles);
      }

      // Periodic state sync to React UI (every few frames)
      setTickCounter((prev) => prev + 1);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      renderer.destroy();
    };
  }, []);

  // Sync tool selection with gameState
  const handleSelectTool = (tool: TerraformTool) => {
    setSelectedTool(tool);
    if (gameStateRef.current) {
      gameStateRef.current.selectedTool = tool;
      gameStateRef.current.selectedTowerToBuild = null;
    }
    setSelectedTower(null);
    rendererRef.current?.hideRangePreview();
  };

  const handleSelectTower = (tower: TowerType | null) => {
    setSelectedTower(tower);
    if (gameStateRef.current) {
      gameStateRef.current.selectedTowerToBuild = tower;
      if (tower) gameStateRef.current.selectedTool = 'inspect';
    }
    if (!tower) rendererRef.current?.hideRangePreview();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditorOpen || isCodexOpen || isSavesOpen || draftRelics.length > 0) return;

      const key = e.key.toUpperCase();
      const g = gameStateRef.current;
      if (!g) return;

      if (e.code === 'Space') {
        e.preventDefault();
        g.isPaused = !g.isPaused;
        soundManager.playClick();
      } else if (key === 'ESCAPE') {
        handleSelectTower(null);
        handleSelectTool('inspect');
        setInspectedTile(null);
      } else if (key === 'Q') handleSelectTool('inspect');
      else if (key === 'W') handleSelectTool('elevate');
      else if (key === 'E') handleSelectTool('lower');
      else if (key === 'R') handleSelectTool('chasm');
      else if (key === 'T') handleSelectTool('channel_lava');
      else if (key === 'Y') handleSelectTool('channel_water');
      else if (key === 'U') handleSelectTool('flatten');
      else if (key === 'X') handleSelectTool('demolish');
      else if (key >= '1' && key <= '8') {
        const towers = Object.keys(TOWER_CONFIGS) as TowerType[];
        const idx = parseInt(key) - 1;
        if (towers[idx]) handleSelectTower(towers[idx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen, isCodexOpen, isSavesOpen, draftRelics]);

  const handleStartWave = () => {
    const g = gameStateRef.current;
    const r = rendererRef.current;
    if (g && r) {
      g.startNextWave();
      r.setWeather(g.currentWeather);
      showNotification(`第 ${g.currentWave} 波魔物已从裂隙苏醒！`);
    }
  };

  const handleRelicSelect = (relic: Relic) => {
    const g = gameStateRef.current;
    if (g) {
      g.selectRelic(relic);
      setDraftRelics([]);
      showNotification(`已结契秘宝: ${relic.name}`);
    }
  };

  const handleRestart = (biome: 'alpine' | 'volcano' | 'marsh' | 'crystal_abyss') => {
    const newGame = new GameState();
    newGame.mapData.biome = biome;
    gameStateRef.current = newGame;

    const r = rendererRef.current;
    if (r) {
      r.buildTerrain(
        newGame.mapData.tiles,
        newGame.mapData.width,
        newGame.mapData.depth,
        newGame.mapData.spawns,
        newGame.mapData.heartCore,
        biome
      );
      r.setWeather(newGame.currentWeather);
      r.updateTowers([], newGame.mapData.tiles);
    }

    setGameOverState({ open: false, victory: false });
    setInspectedTile(null);
    setSelectedTower(null);
    setSelectedTool('inspect');
    showNotification('新征程开始，重塑大地构筑防线！');
  };

  const handlePlaytestCustomMap = (customMap: MapData) => {
    const newGame = new GameState(customMap);
    gameStateRef.current = newGame;

    const r = rendererRef.current;
    if (r) {
      r.buildTerrain(
        customMap.tiles,
        customMap.width,
        customMap.depth,
        customMap.spawns,
        customMap.heartCore,
        customMap.biome
      );
      r.setWeather(newGame.currentWeather);
      r.updateTowers([], customMap.tiles);
    }

    setGameOverState({ open: false, victory: false });
    setInspectedTile(null);
    showNotification(`已载入自定义工坊关卡: ${customMap.title}`);
  };

  const game = gameStateRef.current;
  const inspectedTower =
    game && inspectedTile && inspectedTile.towerId
      ? game.placedTowers.find((t) => t.id === inspectedTile.towerId) || null
      : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#0c0a08]">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={canvasContainerRef} className="absolute inset-0 cursor-crosshair" />

      {/* Top Header Bar */}
      {game && (
        <HeaderBar
          resources={game.resources}
          heartHealth={game.heartHealth}
          maxHeartHealth={game.maxHeartHealth}
          currentWave={game.currentWave}
          totalWaves={game.totalWaves}
          isWaveInProgress={game.isWaveInProgress}
          isPaused={game.isPaused}
          gameSpeed={game.gameSpeed}
          currentWeather={game.currentWeather}
          nextWeather={game.nextWeather}
          isMuted={isMuted}
          onTogglePause={() => {
            game.isPaused = !game.isPaused;
            soundManager.playClick();
          }}
          onCycleSpeed={() => {
            soundManager.playClick();
            game.gameSpeed = game.gameSpeed === 1 ? 2 : game.gameSpeed === 2 ? 4 : 1;
          }}
          onStartWave={handleStartWave}
          onOpenCodex={() => {
            soundManager.playClick();
            setIsCodexOpen(true);
          }}
          onOpenEditor={() => {
            soundManager.playClick();
            setIsEditorOpen(true);
          }}
          onOpenSaves={() => {
            soundManager.playClick();
            setIsSavesOpen(true);
          }}
          onToggleMute={() => {
            const next = !isMuted;
            setIsMuted(next);
            soundManager.setMuted(next);
          }}
          onResetCamera={() => {
            soundManager.playClick();
            rendererRef.current?.resetCameraView();
          }}
        />
      )}

      {/* Left Terraforming Toolbar */}
      {game && (
        <TerraformToolbar
          currentTool={selectedTool}
          onSelectTool={handleSelectTool}
          sparks={game.resources.sparks}
          aether={game.resources.aether}
        />
      )}

      {/* Bottom Tower Construction Panel */}
      {game && (
        <TowerBuildPanel
          selectedTower={selectedTower}
          onSelectTower={handleSelectTower}
          aether={game.resources.aether}
          mana={game.resources.mana}
          sparks={game.resources.sparks}
        />
      )}

      {/* Right Tile & Tower Inspector */}
      {game && inspectedTile && (
        <TileInspector
          tile={inspectedTile}
          tower={inspectedTower}
          aether={game.resources.aether}
          onUpgradeTower={(id) => {
            game.upgradeTower(id);
            setInspectedTile({ ...inspectedTile });
          }}
          onSellTower={(id) => {
            game.sellTower(id);
            rendererRef.current?.updateTowers(game.placedTowers, game.mapData.tiles);
            setInspectedTile(null);
          }}
          onChangeTargetMode={(id, mode) => {
            const t = game.placedTowers.find((tw) => tw.id === id);
            if (t) {
              t.targetMode = mode;
              soundManager.playClick();
              setInspectedTile({ ...inspectedTile });
            }
          }}
          onClose={() => setInspectedTile(null)}
        />
      )}

      {/* Tactical Status Toast */}
      {notification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="parchment-card px-4 py-1.5 rounded-full border border-[#d4af37] text-xs font-cinzel text-[#ffd700] shadow-xl flex items-center gap-2">
            <span>📜</span>
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Mobile Tactical Helper Bar */}
      <div className="absolute bottom-28 left-4 z-10 md:hidden flex gap-2">
        <button
          onClick={() => rendererRef.current?.resetCameraView(false)}
          className="p-2 rounded-lg bg-[#241a12]/90 border border-[#7a5c36] text-[10px] text-[#ffd700] font-cinzel"
        >
          俯视战术视角
        </button>
      </div>

      {/* Roguelike 3-Card Relic Draft Modal */}
      {draftRelics.length > 0 && (
        <RelicDraftModal relics={draftRelics} onSelectRelic={handleRelicSelect} />
      )}

      {/* Ancient Grimoire & Codex Modal */}
      <CodexModal isOpen={isCodexOpen} onClose={() => setIsCodexOpen(false)} />

      {/* Level Architect Workshop Modal */}
      {game && (
        <LevelEditorModal
          isOpen={isEditorOpen}
          currentMap={game.mapData}
          onClose={() => setIsEditorOpen(false)}
          onPlaytestMap={handlePlaytestCustomMap}
        />
      )}

      {/* Saves & Cloud Export Modal */}
      {game && (
        <SavesModal
          isOpen={isSavesOpen}
          onClose={() => setIsSavesOpen(false)}
          onSaveToSlot={(slotId) => game.exportSaveSlot(slotId)}
          onLoadFromSlot={(slot) => {
            game.importSaveSlot(slot);
            rendererRef.current?.buildTerrain(
              slot.mapData.tiles,
              slot.mapData.width,
              slot.mapData.depth,
              slot.mapData.spawns,
              slot.mapData.heartCore,
              slot.mapData.biome
            );
            rendererRef.current?.updateTowers(slot.placedTowers, slot.mapData.tiles);
            showNotification('已成功恢复古卷档案！');
          }}
          getCurrentSaveData={(slotId) => game.exportSaveSlot(slotId)}
        />
      )}

      {/* Game Over Victory / Defeat Modal */}
      {game && (
        <GameOverModal
          isOpen={gameOverState.open}
          isVictory={gameOverState.victory}
          wave={game.currentWave}
          stats={game.stats}
          relics={game.unlockedRelics}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
