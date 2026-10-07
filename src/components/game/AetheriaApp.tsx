'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeRenderer } from '@/game/threeRenderer';
import { GameState } from '@/game/gameState';
import {
  Achievement,
  Difficulty,
  GridTile,
  MapData,
  MapEvent,
  PlacedTower,
  Relic,
  SaveGameSlot,
  TerraformTool,
  TowerSpecialization,
  TowerType,
} from '@/types/game';
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
import { StartMenu, RunConfig } from '@/components/game/StartMenu';
import { HotkeysPanel } from '@/components/game/HotkeysPanel';
import { AchievementToast } from '@/components/game/AchievementToast';
import { ComboMeter } from '@/components/game/ComboMeter';
import { MapEventToast } from '@/components/game/MapEventToast';
import { SpecializationModal } from '@/components/game/SpecializationModal';
import { MobileQuickActions } from '@/components/game/MobileQuickActions';
import { TutorialOverlay, hasSeenTutorial } from '@/components/game/TutorialOverlay';
import { TOWER_CONFIGS } from '@/game/gameData';
import { profileManager } from '@/game/profileManager';
import { generateProceduralMap } from '@/game/proceduralMap';

export default function AetheriaApp() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ThreeRenderer | null>(null);
  const gameStateRef = useRef<GameState | null>(null);

  // Phase: 'menu' until a run is configured, then 'playing'
  const [phase, setPhase] = useState<'menu' | 'playing'>('menu');
  const [runConfig, setRunConfig] = useState<RunConfig | null>(null);

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
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [gameOverState, setGameOverState] = useState<{ open: boolean; victory: boolean }>({
    open: false,
    victory: false,
  });

  // === New mechanics state ===
  const [comboState, setComboState] = useState<{ current: number; multiplier: number; max: number; comboTimer?: number } | null>(null);
  const [activeMapEvent, setActiveMapEvent] = useState<MapEvent | null>(null);
  const [pendingSpecialization, setPendingSpecialization] = useState<{ tower: PlacedTower; options: TowerSpecialization[] } | null>(null);

  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [notification, setNotification] = useState<string | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  }, []);

  /** Track whether a game over has already been recorded to avoid double-counting. */
  const gameOverRecordedRef = useRef(false);

  // Initialize Game & 3D Renderer — runs once when entering 'playing' phase.
  useEffect(() => {
    if (phase !== 'playing' || !canvasContainerRef.current || !runConfig) return;

    // Build a fresh procedural map for the chosen biome, then a game state with
    // the chosen difficulty + endless flag.
    const customMap = generateProceduralMap(runConfig.biome);
    const game = new GameState(customMap, runConfig.difficulty, runConfig.endlessMode, runConfig.dailySeed);
    gameStateRef.current = game;
    gameOverRecordedRef.current = false;

    const renderer = new ThreeRenderer(canvasContainerRef.current);
    rendererRef.current = renderer;

    // Load initial map
    renderer.buildTerrain(
      game.mapData.tiles,
      game.mapData.width,
      game.mapData.depth,
      game.mapData.spawns,
      game.mapData.heartCore,
      game.mapData.biome,
    );
    renderer.setWeather(game.currentWeather);

    // Event hooks
    game.events = {
      onWaveComplete: () => {
        // Triggered on wave complete
      },
      onGameOver: (victory) => {
        setGameOverState({ open: true, victory });
        // Record run to persistent profile (only once per game over)
        if (!gameOverRecordedRef.current) {
          gameOverRecordedRef.current = true;
          const newlyUnlocked = profileManager.recordRun({
            victory,
            wave: game.currentWave,
            bossesSlain: game.stats.bossesSlain,
            tilesTerraformed: game.stats.tilesTerraformed,
            towersBuilt: game.stats.towersBuilt,
            score:
              game.stats.enemiesDefeated * 10 +
              game.currentWave * 100 +
              game.stats.bossesSlain * 500,
            biome: game.mapData.biome,
            difficulty: game.difficulty,
            ironDefender:
              victory &&
              game.heartHealth >= game.maxHeartHealth * 0.8,
          });
          if (newlyUnlocked.length > 0) {
            setAchievementQueue((q) => [...q, ...newlyUnlocked]);
          }
        }
      },
      onRelicDraftOpen: (relics) => {
        setDraftRelics(relics);
      },
      onStateUpdate: () => {},
      onComboUpdate: (combo) => {
        setComboState({ ...combo, comboTimer: gameStateRef.current?.combo.comboTimer });
      },
      onMapEvent: (evt) => {
        setActiveMapEvent(evt);
      },
      onSpecializationPrompt: (tower, options) => {
        setPendingSpecialization({ tower, options });
      },
    };

    // Tile click handler from 3D canvas
    renderer.onTileClick = (x: number, z: number, shiftHeld: boolean) => {
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
          // If shift held, keep selection for continuous building.
          if (!shiftHeld) {
            g.selectedTowerToBuild = null;
            setSelectedTower(null);
            renderer.hideRangePreview();
          } else {
            // Re-show range preview at the just-built tile for next click
            renderer.setRangePreview(
              TOWER_CONFIGS[g.selectedTowerToBuild].range,
              x,
              z,
              tile.height,
            );
          }
        } else {
          showNotification('无法在此地块建造 (资源不足或地基不稳)');
        }
        return;
      }

      // If terraforming (shift also enables continuous terraform dragging)
      if (g.selectedTool !== 'inspect') {
        const terraformed = g.applyTerraform(x, z, g.selectedTool);
        if (terraformed) {
          renderer.updateTile(tile, g.mapData.biome);
          if (!shiftHeld) {
            showNotification(`地貌重塑成功: [${x}, ${z}]`);
          }
        } else if (!shiftHeld) {
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
        const totalRange =
          (cfg.range + elevationBonus) * g.gameModifiers.towerRangeMult[g.selectedTowerToBuild];
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
      gameStateRef.current = null;
      rendererRef.current = null;
    };
  }, [phase, runConfig, showNotification]);

  // Auto-pause when window loses focus (saves players from AFK deaths)
  useEffect(() => {
    if (phase !== 'playing') return;
    const onBlur = () => {
      const g = gameStateRef.current;
      if (g && g.isWaveInProgress && !g.isPaused) {
        g.isPaused = true;
        showNotification('窗口失焦·已自动暂停');
      }
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [phase, showNotification]);

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
    if (phase !== 'playing') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditorOpen || isCodexOpen || isSavesOpen || draftRelics.length > 0 || gameOverState.open) {
        // Only allow Escape / H to close hotkeys; block other keys
        if (e.key.toUpperCase() === 'H') {
          setIsHotkeysOpen((v) => !v);
        }
        return;
      }

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
        setIsHotkeysOpen(false);
      } else if (key === 'H') {
        setIsHotkeysOpen((v) => !v);
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
  }, [isEditorOpen, isCodexOpen, isSavesOpen, draftRelics, phase, gameOverState.open]);

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

  const handleStartRun = (cfg: RunConfig) => {
    setRunConfig(cfg);
    setPhase('playing');
    // Show tutorial for first-time users (not for daily challenges)
    if (!cfg.dailySeed && !hasSeenTutorial()) {
      setTimeout(() => setShowTutorial(true), 1200);
    }
  };

  const handleReturnToMenu = () => {
    setPhase('menu');
    setGameOverState({ open: false, victory: false });
    setInspectedTile(null);
    setSelectedTower(null);
    setSelectedTool('inspect');
    setIsHotkeysOpen(false);
    setComboState(null);
    setActiveMapEvent(null);
    setPendingSpecialization(null);
    setShowTutorial(false);
  };

  const handleRestart = (biome: 'alpine' | 'volcano' | 'marsh' | 'crystal_abyss') => {
    const currentCfg = runConfig || { biome, difficulty: 'adept' as Difficulty, endlessMode: false };
    const cfg: RunConfig = { ...currentCfg, biome };
    setRunConfig(cfg);
    // Force remount of game by toggling phase
    setPhase('menu');
    setTimeout(() => {
      setRunConfig(cfg);
      setPhase('playing');
    }, 50);
    setGameOverState({ open: false, victory: false });
    setInspectedTile(null);
    setSelectedTower(null);
    setSelectedTool('inspect');
    showNotification('新征程开始，重塑大地构筑防线！');
  };

  const handlePlaytestCustomMap = (customMap: MapData) => {
    // For playtest, use the current difficulty (default adept) and standard mode.
    if (gameStateRef.current) {
      const newGame = new GameState(customMap, runConfig?.difficulty || 'adept', false);
      gameStateRef.current = newGame;
      gameOverRecordedRef.current = false;
    }

    const r = rendererRef.current;
    if (r) {
      r.buildTerrain(
        customMap.tiles,
        customMap.width,
        customMap.depth,
        customMap.spawns,
        customMap.heartCore,
        customMap.biome,
      );
      if (gameStateRef.current) {
        r.setWeather(gameStateRef.current.currentWeather);
      }
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

  // Start menu takes precedence over the canvas while waiting for a config.
  if (phase === 'menu') {
    return (
      <StartMenu
        onStart={handleStartRun}
        onOpenCodex={() => setIsCodexOpen(true)}
      />
    );
  }

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none bg-[#0c0a08]"
      onContextMenu={(e) => {
        // Right-click cancels current selection
        e.preventDefault();
        handleSelectTower(null);
        handleSelectTool('inspect');
        setInspectedTile(null);
      }}
    >
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
          onReturnToMenu={handleReturnToMenu}
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

      {/* Quick hotkey hint when nothing selected (auto-fades) */}
      {game && !isWaveInProgressActive(game) && !selectedTower && selectedTool === 'inspect' && (
        <div className="absolute top-1/2 right-4 -translate-y-1/2 z-10 pointer-events-none hidden md:block">
          <div className="parchment-card px-3 py-2 rounded-xl border border-[#634f35] text-[10px] text-[#aa9578] font-cinzel">
            按 <kbd className="font-mono-code text-[#ffd700]">H</kbd> 查看快捷键
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

      {/* Hotkeys Reference Panel */}
      <HotkeysPanel isOpen={isHotkeysOpen} onClose={() => setIsHotkeysOpen(false)} />

      {/* Achievement toasts */}
      <AchievementToast
        queue={achievementQueue}
        onDismiss={(id) => setAchievementQueue((q) => q.filter((a) => a.id !== id))}
      />

      {/* Combo meter (appears during active combos) */}
      <ComboMeter combo={comboState} />

      {/* Map event toast (large celebratory notification) */}
      <MapEventToast event={activeMapEvent} onDismiss={() => setActiveMapEvent(null)} />

      {/* Tower specialization modal */}
      <SpecializationModal
        tower={pendingSpecialization?.tower || null}
        options={pendingSpecialization?.options || []}
        onSelect={(towerId, spec) => {
          game?.applySpecialization(towerId, spec);
          setPendingSpecialization(null);
          showNotification(`已觉醒专精: ${spec}`);
        }}
      />

      {/* First-time tutorial overlay */}
      <TutorialOverlay isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      {/* Mobile-only floating quick action buttons */}
      {game && (
        <MobileQuickActions
          isPaused={game.isPaused}
          gameSpeed={game.gameSpeed}
          isWaveInProgress={game.isWaveInProgress}
          onTogglePause={() => { game.isPaused = !game.isPaused; soundManager.playClick(); }}
          onCycleSpeed={() => {
            soundManager.playClick();
            game.gameSpeed = game.gameSpeed === 1 ? 2 : game.gameSpeed === 2 ? 4 : 1;
          }}
          onResetCamera={() => rendererRef.current?.resetCameraView()}
        />
      )}

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
              slot.mapData.biome,
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
          onReturnToMenu={handleReturnToMenu}
        />
      )}
    </div>
  );
}

/** Tiny helper so the hotkey-hint can fade when a wave is in progress. */
function isWaveInProgressActive(g: GameState): boolean {
  return g.isWaveInProgress;
}
