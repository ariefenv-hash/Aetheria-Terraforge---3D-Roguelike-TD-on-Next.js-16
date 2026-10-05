import { soundManager } from '@/audio/soundManager';
import {
  ActiveEnemy,
  Difficulty,
  EnemyConfig,
  GameModifiers,
  GameStats,
  GridTile,
  MapData,
  PlacedTower,
  Projectile,
  Relic,
  Resources,
  SaveGameSlot,
  TerraformTool,
  TowerConfig,
  TowerType,
  WaveConfig,
  WeatherType,
} from '@/types/game';
import { ENEMY_CONFIGS, RELIC_POOL, TOWER_CONFIGS, WEATHER_CONFIGS } from './gameData';
import { findPath } from './pathfinding';
import { generateProceduralMap } from './proceduralMap';

/** Per-difficulty tuning knobs. */
export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    label: string;
    heartHealthMult: number;
    enemyHpMult: number;
    enemyDamageMult: number;
    aetherBonus: number;
    manaBonus: number;
    sparksBonus: number;
    description: string;
  }
> = {
  novice: {
    label: '学徒 (Novice)',
    heartHealthMult: 1.4,
    enemyHpMult: 0.85,
    enemyDamageMult: 0.7,
    aetherBonus: 60,
    manaBonus: 30,
    sparksBonus: 3,
    description: '更厚的地脉核心、更弱的魔物。适合熟悉机制。',
  },
  adept: {
    label: '术师 (Adept)',
    heartHealthMult: 1.0,
    enemyHpMult: 1.0,
    enemyDamageMult: 1.0,
    aetherBonus: 0,
    manaBonus: 0,
    sparksBonus: 0,
    description: '标准挑战，资源平衡，需要周密布阵。',
  },
  archmage: {
    label: '大法师 (Archmage)',
    heartHealthMult: 0.75,
    enemyHpMult: 1.25,
    enemyDamageMult: 1.35,
    aetherBonus: -30,
    manaBonus: -10,
    sparksBonus: -1,
    description: '极度考验：核心脆弱、魔物凶猛、资源紧张。',
  },
};

export interface GameEvents {
  onWaveComplete: (wave: number) => void;
  onGameOver: (victory: boolean) => void;
  onRelicDraftOpen: (relics: Relic[]) => void;
  onStateUpdate: () => void;
}

export class GameState {
  public mapData: MapData;
  public resources: Resources;
  public heartHealth: number = 100;
  public maxHeartHealth: number = 100;
  public currentWave: number = 0;
  public totalWaves: number = 20;
  public difficulty: Difficulty = 'adept';
  public endlessMode: boolean = false;
  /** Set true once the standard 20-wave victory has been achieved. */
  public hasWonStandardRun: boolean = false;

  public placedTowers: PlacedTower[] = [];
  public activeEnemies: ActiveEnemy[] = [];
  public projectiles: Projectile[] = [];

  public currentWeather: WeatherType = 'clear';
  public nextWeather: WeatherType = 'clear';

  public isWaveInProgress: boolean = false;
  public isPaused: boolean = false;
  public gameSpeed: number = 1; // 1x, 2x, 4x

  public selectedTool: TerraformTool = 'inspect';
  public selectedTowerToBuild: TowerType | null = null;
  public selectedTile: GridTile | null = null;

  public unlockedRelics: Relic[] = [];
  public gameModifiers: GameModifiers;
  public stats: GameStats;

  // Wave spawn state
  private spawnQueue: { enemyType: string; delay: number; spawnIndex: number }[] = [];
  private waveTimer: number = 0;

  // Event callbacks
  public events?: GameEvents;

  constructor(customMap?: MapData, difficulty: Difficulty = 'adept', endlessMode = false) {
    this.mapData = customMap || generateProceduralMap('alpine');
    this.difficulty = difficulty;
    this.endlessMode = endlessMode;
    this.totalWaves = endlessMode ? 999 : 20;

    const diffCfg = DIFFICULTY_CONFIG[difficulty];
    this.maxHeartHealth = Math.round(100 * diffCfg.heartHealthMult);
    this.heartHealth = this.maxHeartHealth;

    this.resources = {
      aether: Math.max(0, this.mapData.initialAether + diffCfg.aetherBonus),
      mana: Math.max(0, this.mapData.initialMana + diffCfg.manaBonus),
      souls: 0,
      sparks: Math.max(0, this.mapData.initialSparks + diffCfg.sparksBonus),
    };

    this.gameModifiers = this.createDefaultModifiers();
    this.stats = {
      enemiesDefeated: 0,
      damageDealt: 0,
      tilesTerraformed: 0,
      towersBuilt: 0,
      soulsHarvested: 0,
      highestWave: 0,
      bossesSlain: 0,
    };

    this.forecastNextWeather();
  }

  /** Difficulty multiplier applied to enemy HP scaling. */
  private get enemyHpMult() {
    return DIFFICULTY_CONFIG[this.difficulty].enemyHpMult;
  }

  /** Difficulty multiplier applied to enemy damage (heart core hits). */
  private get enemyDmgMult() {
    return DIFFICULTY_CONFIG[this.difficulty].enemyDamageMult;
  }

  private createDefaultModifiers(): GameModifiers {
    return {
      towerDamageMult: {
        ballista: 1.0,
        catapult: 1.0,
        pyromancer: 1.0,
        arcane_prism: 1.0,
        cryo_obelisk: 1.0,
        geomancer: 1.0,
        mine: 1.0,
        barricade: 1.0,
      },
      towerRangeMult: {
        ballista: 1.0,
        catapult: 1.0,
        pyromancer: 1.0,
        arcane_prism: 1.0,
        cryo_obelisk: 1.0,
        geomancer: 1.0,
        mine: 1.0,
        barricade: 1.0,
      },
      towerCostMult: 1.0,
      terraformingCostMult: 1.0,
      highGroundDmgBonus: 0.2, // +20% dmg per height > 1
      highGroundRangeBonus: 0.25, // +25% range per height > 1
      trenchBurnMult: 1.0,
      waterConductElectricity: false,
      enemiesSlowUphill: 0.4,
      soulYieldMult: 1.0,
      aetherYieldMult: 1.0,
      sparkYieldMult: 1.0,
      wallsReflectDamage: false,
      weatherResistance: false,
      blizzardShatterChance: 0,
    };
  }

  // --- Weather System ---
  private forecastNextWeather() {
    const weathers: WeatherType[] = ['clear', 'thunderstorm', 'ashfall', 'blizzard', 'miasma'];
    // Bias towards current biome
    if (this.mapData.biome === 'volcano') {
      weathers.push('ashfall', 'ashfall');
    } else if (this.mapData.biome === 'marsh') {
      weathers.push('thunderstorm', 'miasma');
    }
    const idx = Math.floor(Math.random() * weathers.length);
    this.nextWeather = weathers[idx];
  }

  // --- Terraforming Mechanics ---
  public getTile(x: number, z: number): GridTile | undefined {
    if (x < 0 || x >= this.mapData.width || z < 0 || z >= this.mapData.depth) return undefined;
    return this.mapData.tiles[z * this.mapData.width + x];
  }

  public canTerraform(x: number, z: number, tool: TerraformTool): { ok: boolean; reason?: string; costSparks: number; costAether: number } {
    const tile = this.getTile(x, z);
    if (!tile) return { ok: false, reason: '无效地块', costSparks: 0, costAether: 0 };

    // Cannot terraform Heart Core or Spawns directly
    if (x === this.mapData.heartCore.x && z === this.mapData.heartCore.z) {
      return { ok: false, reason: '无法改变地脉核心基座', costSparks: 0, costAether: 0 };
    }
    if (this.mapData.spawns.some((s) => s.x === x && s.z === z)) {
      return { ok: false, reason: '无法改变异界裂隙传送门', costSparks: 0, costAether: 0 };
    }

    let costSparks = 1;
    let costAether = 15;

    switch (tool) {
      case 'elevate':
        if (tile.height >= 4) return { ok: false, reason: '已达到地形最高极限(4层峰顶)', costSparks: 0, costAether: 0 };
        costSparks = Math.round(1 * this.gameModifiers.terraformingCostMult);
        costAether = Math.round(20 * this.gameModifiers.terraformingCostMult);
        break;
      case 'lower':
        if (tile.height <= 0) return { ok: false, reason: '已开凿至地底最低深渊(0层)', costSparks: 0, costAether: 0 };
        costSparks = Math.round(1 * this.gameModifiers.terraformingCostMult);
        costAether = Math.round(15 * this.gameModifiers.terraformingCostMult);
        break;
      case 'chasm':
        if (tile.height === 0) return { ok: false, reason: '已是深渊断崖', costSparks: 0, costAether: 0 };
        costSparks = Math.round(2 * this.gameModifiers.terraformingCostMult);
        costAether = Math.round(35 * this.gameModifiers.terraformingCostMult);
        break;
      case 'channel_lava':
      case 'channel_water':
        costSparks = Math.round(1 * this.gameModifiers.terraformingCostMult);
        costAether = Math.round(25 * this.gameModifiers.terraformingCostMult);
        break;
      case 'flatten':
        costSparks = 1;
        costAether = 10;
        break;
      case 'demolish':
        return { ok: !!tile.towerId, reason: tile.towerId ? '' : '此地块无建筑可拆除', costSparks: 0, costAether: 0 };
      default:
        return { ok: true, costSparks: 0, costAether: 0 };
    }

    if (this.resources.sparks < costSparks) {
      return { ok: false, reason: `造物印记不足 (需要 ${costSparks})`, costSparks, costAether };
    }
    if (this.resources.aether < costAether) {
      return { ok: false, reason: `地脉原石不足 (需要 ${costAether})`, costSparks, costAether };
    }

    return { ok: true, costSparks, costAether };
  }

  public applyTerraform(x: number, z: number, tool: TerraformTool): boolean {
    const check = this.canTerraform(x, z, tool);
    if (!check.ok) return false;

    const tile = this.getTile(x, z);
    if (!tile) return false;

    this.resources.sparks -= check.costSparks;
    this.resources.aether -= check.costAether;
    this.stats.tilesTerraformed++;

    switch (tool) {
      case 'elevate':
        tile.height = Math.min(4, tile.height + 1);
        tile.isWalkable = true;
        soundManager.playTerraform(true);
        break;
      case 'lower':
        tile.height = Math.max(0, tile.height - 1);
        if (tile.height === 0) {
          tile.type = this.mapData.biome === 'volcano' ? 'lava' : 'water';
        }
        soundManager.playTerraform(false);
        break;
      case 'chasm':
        tile.height = 0;
        tile.type = 'chasm';
        tile.isWalkable = false;
        soundManager.playTerraform(false);
        break;
      case 'channel_lava':
        tile.type = 'lava';
        soundManager.playFire();
        break;
      case 'channel_water':
        tile.type = 'water';
        soundManager.playClick();
        break;
      case 'flatten':
        tile.height = 1;
        tile.type = 'plains';
        tile.isWalkable = true;
        soundManager.playTerraform(true);
        break;
      case 'demolish':
        if (tile.towerId) {
          this.placedTowers = this.placedTowers.filter((t) => t.id !== tile.towerId);
          tile.towerId = undefined;
          this.resources.aether += 25; // partial refund
          soundManager.playBuild();
        }
        break;
    }

    // Dynamic Recalculate paths for existing active enemies
    this.recalculateEnemyPaths();

    return true;
  }

  // --- Tower Construction ---
  public canBuildTower(x: number, z: number, towerType: TowerType): { ok: boolean; reason?: string } {
    const tile = this.getTile(x, z);
    if (!tile) return { ok: false, reason: '无效地块' };

    if (tile.towerId) return { ok: false, reason: '已有建筑存在' };
    if (x === this.mapData.heartCore.x && z === this.mapData.heartCore.z) {
      return { ok: false, reason: '核心位置不可覆盖' };
    }
    if (this.mapData.spawns.some((s) => s.x === x && s.z === z)) {
      return { ok: false, reason: '不可直接堵死传送门' };
    }
    if (tile.height === 0 && (tile.type === 'chasm' || tile.type === 'lava')) {
      return { ok: false, reason: '深渊或烈焰中无法稳固地基' };
    }

    const cfg = TOWER_CONFIGS[towerType];
    const costAether = Math.round(cfg.cost.aether * this.gameModifiers.towerCostMult);
    const costMana = cfg.cost.mana;
    const costSparks = cfg.cost.sparks || 0;

    if (this.resources.aether < costAether) return { ok: false, reason: `原石不足 (需要 ${costAether})` };
    if (this.resources.mana < costMana) return { ok: false, reason: `灵能不足 (需要 ${costMana})` };
    if (this.resources.sparks < costSparks) return { ok: false, reason: `造物印记不足 (需要 ${costSparks})` };

    return { ok: true };
  }

  public buildTower(x: number, z: number, towerType: TowerType): boolean {
    const check = this.canBuildTower(x, z, towerType);
    if (!check.ok) return false;

    const tile = this.getTile(x, z);
    if (!tile) return false;

    const cfg = TOWER_CONFIGS[towerType];
    const costAether = Math.round(cfg.cost.aether * this.gameModifiers.towerCostMult);
    const costMana = cfg.cost.mana;
    const costSparks = cfg.cost.sparks || 0;

    this.resources.aether -= costAether;
    this.resources.mana -= costMana;
    this.resources.sparks -= costSparks;

    const tower: PlacedTower = {
      id: `tower_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x,
      z,
      type: towerType,
      level: 1,
      targetMode: 'first',
      currentCooldown: 0,
      totalKills: 0,
      totalDamageDealt: 0,
    };

    tile.towerId = tower.id;
    this.placedTowers.push(tower);
    this.stats.towersBuilt++;

    soundManager.playBuild();

    // Recalculate paths
    this.recalculateEnemyPaths();

    return true;
  }

  public upgradeTower(towerId: string): boolean {
    const tower = this.placedTowers.find((t) => t.id === towerId);
    if (!tower) return false;

    const upgradeCost = Math.round(TOWER_CONFIGS[tower.type].cost.aether * 0.8 * tower.level);
    if (this.resources.aether < upgradeCost) return false;

    this.resources.aether -= upgradeCost;
    tower.level += 1;
    soundManager.playBuild();
    return true;
  }

  public sellTower(towerId: string): boolean {
    const tower = this.placedTowers.find((t) => t.id === towerId);
    if (!tower) return false;

    const tile = this.getTile(tower.x, tower.z);
    if (tile) tile.towerId = undefined;

    const refund = Math.round(TOWER_CONFIGS[tower.type].cost.aether * 0.65 * tower.level);
    this.resources.aether += refund;
    this.placedTowers = this.placedTowers.filter((t) => t.id !== towerId);

    soundManager.playBuild();
    this.recalculateEnemyPaths();
    return true;
  }

  // --- Dynamic Pathfinding Recalculation ---
  public recalculateEnemyPaths() {
    this.activeEnemies.forEach((enemy) => {
      if (enemy.isFlying) return; // Flying units keep direct flight path
      const currentPos = { x: Math.round(enemy.x), z: Math.round(enemy.z) };
      const newPath = findPath(
        this.mapData.tiles,
        this.mapData.width,
        this.mapData.depth,
        currentPos,
        this.mapData.heartCore,
        false
      );
      if (newPath.length > 0) {
        enemy.path = newPath;
        enemy.currentWaypointIndex = 0;
      }
    });
  }

  // --- Wave Management ---
  public startNextWave(): boolean {
    if (this.isWaveInProgress) return false;

    this.currentWave += 1;
    this.isWaveInProgress = true;
    this.waveTimer = 0;
    this.stats.highestWave = Math.max(this.stats.highestWave, this.currentWave);

    // Shift to forecasted weather
    this.currentWeather = this.nextWeather;
    this.forecastNextWeather();

    // Replenish Sparks
    const sparksGain = Math.round(3 * this.gameModifiers.sparkYieldMult);
    this.resources.sparks += sparksGain;

    // Mine extractors yield resources
    let mineAether = 0;
    let mineMana = 0;
    this.placedTowers.forEach((t) => {
      if (t.type === 'mine') {
        const tile = this.getTile(t.x, t.z);
        const nearCrystal = tile?.hasCrystal || false;
        const multiplier = (nearCrystal ? 2.2 : 1.0) * t.level;
        mineAether += Math.round(35 * multiplier * this.gameModifiers.aetherYieldMult);
        mineMana += Math.round(20 * multiplier);
      }
    });
    this.resources.aether += mineAether;
    this.resources.mana += mineMana;

    // Generate wave enemy queue
    this.buildWaveSpawnQueue(this.currentWave);

    soundManager.playWarHorn();
    return true;
  }

  private buildWaveSpawnQueue(waveNumber: number) {
    this.spawnQueue = [];

    // Scaling difficulty
    const isBossWave = waveNumber % 5 === 0;

    let goblinCount = Math.min(30, 4 + waveNumber * 2);
    let scoutCount = Math.max(0, Math.floor((waveNumber - 2) * 1.5));
    let armoredCount = Math.max(0, Math.floor((waveNumber - 3) * 1.2));
    let gargoyleCount = Math.max(0, Math.floor((waveNumber - 4) * 1.0));
    let burrowerCount = Math.max(0, Math.floor((waveNumber - 5) * 0.8));
    let ashCount = this.mapData.biome === 'volcano' ? Math.floor(waveNumber * 1.2) : 0;

    let timeOffset = 0;

    // Helper to queue enemies
    const enqueue = (type: string, count: number, interval: number) => {
      for (let i = 0; i < count; i++) {
        const spawnIdx = i % this.mapData.spawns.length;
        this.spawnQueue.push({
          enemyType: type,
          delay: timeOffset,
          spawnIndex: spawnIdx,
        });
        timeOffset += interval;
      }
    };

    enqueue('goblin', goblinCount, 0.9);
    enqueue('scout', scoutCount, 0.75);
    enqueue('armored_orc', armoredCount, 1.4);
    enqueue('gargoyle', gargoyleCount, 1.2);
    enqueue('burrower', burrowerCount, 1.3);
    if (ashCount > 0) enqueue('ash_elemental', ashCount, 1.5);

    if (isBossWave) {
      timeOffset += 2.0;
      const bossType = waveNumber % 10 === 0 ? 'storm_wyrm' : 'colossus_boss';
      this.spawnQueue.push({
        enemyType: bossType,
        delay: timeOffset,
        spawnIndex: 0,
      });
    }
  }

  // --- Main Game Tick (Delta Time in seconds) ---
  public tick(rawDt: number) {
    if (this.isPaused) return;

    const dt = Math.min(0.1, rawDt) * this.gameSpeed;

    // 1. Process wave spawns
    if (this.isWaveInProgress) {
      this.waveTimer += dt;
      for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
        const item = this.spawnQueue[i];
        if (this.waveTimer >= item.delay) {
          this.spawnEnemy(item.enemyType, item.spawnIndex);
          this.spawnQueue.splice(i, 1);
        }
      }
    }

    // 2. Update active enemies
    this.updateEnemies(dt);

    // 3. Update towers (acquire targets, attack)
    this.updateTowers(dt);

    // 4. Update projectiles
    this.updateProjectiles(dt);

    // 5. Check wave completion
    if (this.isWaveInProgress && this.spawnQueue.length === 0 && this.activeEnemies.length === 0) {
      this.finishWave();
    }
  }

  private spawnEnemy(enemyType: string, spawnIndex: number) {
    const cfg = ENEMY_CONFIGS[enemyType];
    if (!cfg) return;

    const spawnPoint = this.mapData.spawns[spawnIndex % this.mapData.spawns.length];
    const path = findPath(
      this.mapData.tiles,
      this.mapData.width,
      this.mapData.depth,
      spawnPoint,
      this.mapData.heartCore,
      cfg.isFlying
    );

    // Wave health scaling (+12% per wave) + difficulty multiplier
    const waveScaling = (1 + (this.currentWave - 1) * 0.12) * this.enemyHpMult;
    const maxHp = Math.round(cfg.maxHealth * waveScaling);

    const spawnTile = this.getTile(spawnPoint.x, spawnPoint.z);
    const startHeight = spawnTile ? spawnTile.height : 1;

    const enemy: ActiveEnemy = {
      id: `enemy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: cfg.type,
      maxHealth: maxHp,
      health: maxHp,
      x: spawnPoint.x,
      y: cfg.isFlying ? 2.5 : startHeight * 0.55 + 0.1,
      z: spawnPoint.z,
      speed: cfg.speed,
      currentWaypointIndex: 0,
      path,
      slowTimer: 0,
      slowFactor: 1.0,
      burnTimer: 0,
      burnDamage: 0,
      frozenTimer: 0,
      isFlying: cfg.isFlying,
    };

    this.activeEnemies.push(enemy);
  }

  private updateEnemies(dt: number) {
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];

      // Burn ticks
      if (enemy.burnTimer > 0) {
        enemy.burnTimer -= dt;
        const burnDmg = enemy.burnDamage * dt;
        enemy.health -= burnDmg;
        this.stats.damageDealt += burnDmg;
      }

      // Freeze ticks
      if (enemy.frozenTimer > 0) {
        enemy.frozenTimer -= dt;
        // Frozen enemies cannot move
        if (enemy.health <= 0) {
          this.handleEnemyDeath(enemy, i);
        }
        continue;
      }

      // Slow ticks
      let effectiveSpeed = enemy.speed;
      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
        effectiveSpeed *= enemy.slowFactor;
      }

      // Blizzard weather ground slow
      if (this.currentWeather === 'blizzard' && !enemy.isFlying) {
        effectiveSpeed *= 0.75;
      }
      // Thunderstorm air slow for fliers
      if (this.currentWeather === 'thunderstorm' && enemy.isFlying) {
        effectiveSpeed *= 0.7;
      }

      // Movement along path
      if (enemy.path && enemy.currentWaypointIndex < enemy.path.length) {
        const targetPt = enemy.path[enemy.currentWaypointIndex];
        const dx = targetPt.x - enemy.x;
        const dz = targetPt.z - enemy.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Height adjustment
        const currentTile = this.getTile(Math.round(enemy.x), Math.round(enemy.z));
        const currentH = currentTile ? currentTile.height : 1;
        const targetH = targetPt.height;

        // Uphill slow
        if (targetH > currentH && !enemy.isFlying) {
          effectiveSpeed *= (1 - this.gameModifiers.enemiesSlowUphill);
        }

        // Lava damage if standing on lava
        if (currentTile?.type === 'lava' && !enemy.isFlying && enemy.type !== 'ash_elemental') {
          const lavaBurn = (this.currentWeather === 'ashfall' ? 70 : 35) * this.gameModifiers.trenchBurnMult * dt;
          enemy.health -= lavaBurn;
        }

        const moveStep = effectiveSpeed * dt;
        if (dist <= moveStep) {
          enemy.x = targetPt.x;
          enemy.z = targetPt.z;
          enemy.currentWaypointIndex++;
        } else {
          enemy.x += (dx / dist) * moveStep;
          enemy.z += (dz / dist) * moveStep;
        }

        // Height interpolation
        const targetY = enemy.isFlying ? 2.5 : targetH * 0.55 + 0.1;
        enemy.y += (targetY - enemy.y) * Math.min(1, dt * 8);
      }

      // Check if enemy reached Heart Core
      const distToCore = Math.sqrt(
        Math.pow(enemy.x - this.mapData.heartCore.x, 2) + Math.pow(enemy.z - this.mapData.heartCore.z, 2)
      );

      if (distToCore < 0.6) {
        const baseDmg = enemy.type === 'colossus_boss' || enemy.type === 'storm_wyrm' ? 35 : 10;
        const damage = Math.max(1, Math.round(baseDmg * this.enemyDmgMult));
        this.heartHealth = Math.max(0, this.heartHealth - damage);
        soundManager.playCoreAlarm();
        this.activeEnemies.splice(i, 1);

        if (this.heartHealth <= 0) {
          this.handleGameOver(false);
          return;
        }
        continue;
      }

      // Check death
      if (enemy.health <= 0) {
        this.handleEnemyDeath(enemy, i);
      }
    }
  }

  private handleEnemyDeath(enemy: ActiveEnemy, index: number) {
    this.activeEnemies.splice(index, 1);
    this.stats.enemiesDefeated++;

    const cfg = ENEMY_CONFIGS[enemy.type];
    if (cfg) {
      const aetherGain = Math.round(cfg.aetherReward * this.gameModifiers.aetherYieldMult);
      const soulsGain = Math.round(cfg.soulReward * this.gameModifiers.soulYieldMult);
      this.resources.aether += aetherGain;
      this.resources.souls += soulsGain;
      this.stats.soulsHarvested += soulsGain;
    }

    if (enemy.type === 'colossus_boss' || enemy.type === 'storm_wyrm') {
      this.stats.bossesSlain++;
    }

    soundManager.playEnemyDeath();
  }

  private updateTowers(dt: number) {
    this.placedTowers.forEach((tower) => {
      const cfg = TOWER_CONFIGS[tower.type];
      if (cfg.damage <= 0) return; // e.g. barricade, mine

      tower.currentCooldown = Math.max(0, tower.currentCooldown - dt);
      if (tower.currentCooldown > 0) return;

      const tile = this.getTile(tower.x, tower.z);
      const towerHeight = tile ? tile.height : 1;

      // Elevation Bonus Range
      const elevationAdvantage = Math.max(0, towerHeight - 1);
      const effectiveRange =
        (cfg.range + elevationAdvantage * cfg.elevationBonusRange * (1 + this.gameModifiers.highGroundRangeBonus)) *
        this.gameModifiers.towerRangeMult[tower.type];

      // Find targets in range
      const validEnemies = this.activeEnemies.filter((enemy) => {
        const d = Math.sqrt(Math.pow(enemy.x - tower.x, 2) + Math.pow(enemy.z - tower.z, 2));
        return d <= effectiveRange;
      });

      if (validEnemies.length === 0) return;

      // Target selection mode
      let target: ActiveEnemy = validEnemies[0];
      if (tower.targetMode === 'flying') {
        const flying = validEnemies.find((e) => e.isFlying);
        if (flying) target = flying;
      } else if (tower.targetMode === 'strongest') {
        validEnemies.sort((a, b) => b.health - a.health);
        target = validEnemies[0];
      } else if (tower.targetMode === 'closest') {
        validEnemies.sort((a, b) => {
          const da = Math.pow(a.x - tower.x, 2) + Math.pow(a.z - tower.z, 2);
          const db = Math.pow(b.x - tower.x, 2) + Math.pow(b.z - tower.z, 2);
          return da - db;
        });
        target = validEnemies[0];
      }

      // Check mana drain per shot if required (e.g. Arcane Prism)
      if (cfg.manaDrainPerShot && this.resources.mana < cfg.manaDrainPerShot) {
        return; // out of mana
      }
      if (cfg.manaDrainPerShot) {
        this.resources.mana -= cfg.manaDrainPerShot;
      }

      // Fire projectile
      this.fireTower(tower, target, towerHeight);
      tower.currentCooldown = 1 / cfg.fireRate;
    });
  }

  private fireTower(tower: PlacedTower, target: ActiveEnemy, towerHeight: number) {
    const cfg = TOWER_CONFIGS[tower.type];

    // Elevation bonus damage
    const elevationAdvantage = Math.max(0, towerHeight - 1);
    const baseDmg = cfg.damage * (1 + (tower.level - 1) * 0.45);
    const elevationBonus = elevationAdvantage * cfg.elevationBonusDmg * (1 + this.gameModifiers.highGroundDmgBonus);
    const totalDmg = Math.round((baseDmg + elevationBonus) * this.gameModifiers.towerDamageMult[tower.type]);

    const startPos = {
      x: tower.x,
      y: towerHeight * 0.55 + 0.5,
      z: tower.z,
    };

    const projectile: Projectile = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startX: startPos.x,
      startY: startPos.y,
      startZ: startPos.z,
      currentX: startPos.x,
      currentY: startPos.y,
      currentZ: startPos.z,
      targetEnemyId: target.id,
      targetPos: { x: target.x, y: target.y, z: target.z },
      speed: tower.type === 'catapult' ? 5.5 : 12.0,
      damage: totalDmg,
      damageType: cfg.damageType,
      splashRadius: cfg.splashRadius || 0,
      slowFactor: cfg.slowPercent ? 1 - cfg.slowPercent : undefined,
      slowDuration: 3.5,
      color: cfg.color,
      progress: 0,
      arcHeight: tower.type === 'catapult' ? 3.0 : 0,
    };

    this.projectiles.push(projectile);

    // Audio triggers
    if (tower.type === 'ballista') soundManager.playBallista();
    else if (tower.type === 'catapult') soundManager.playCatapult();
    else if (tower.type === 'pyromancer') soundManager.playFire();
    else if (tower.type === 'arcane_prism') soundManager.playArcane();
    else if (tower.type === 'cryo_obelisk') soundManager.playFrost();
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      // Update target pos if target still exists
      const targetEnemy = this.activeEnemies.find((e) => e.id === proj.targetEnemyId);
      if (targetEnemy) {
        proj.targetPos = { x: targetEnemy.x, y: targetEnemy.y, z: targetEnemy.z };
      }

      const totalDist = Math.sqrt(
        Math.pow(proj.targetPos.x - proj.startX, 2) + Math.pow(proj.targetPos.z - proj.startZ, 2)
      );

      const step = (proj.speed * dt) / Math.max(1, totalDist);
      proj.progress = Math.min(1, proj.progress + step);

      // Interpolate
      proj.currentX = proj.startX + (proj.targetPos.x - proj.startX) * proj.progress;
      proj.currentZ = proj.startZ + (proj.targetPos.z - proj.startZ) * proj.progress;

      let currentY = proj.startY + (proj.targetPos.y - proj.startY) * proj.progress;
      if (proj.arcHeight && proj.arcHeight > 0) {
        currentY += Math.sin(proj.progress * Math.PI) * proj.arcHeight;
      }
      proj.currentY = currentY;

      // Hit
      if (proj.progress >= 1.0) {
        this.hitProjectile(proj);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private hitProjectile(proj: Projectile) {
    if (proj.splashRadius > 0) {
      // Splash damage
      this.activeEnemies.forEach((enemy) => {
        const d = Math.sqrt(Math.pow(enemy.x - proj.targetPos.x, 2) + Math.pow(enemy.z - proj.targetPos.z, 2));
        if (d <= proj.splashRadius) {
          this.applyDamageToEnemy(enemy, proj.damage * (1 - d / (proj.splashRadius * 1.5)), proj);
        }
      });
    } else {
      // Single target
      const target = this.activeEnemies.find((e) => e.id === proj.targetEnemyId);
      if (target) {
        this.applyDamageToEnemy(target, proj.damage, proj);
      }
    }
  }

  private applyDamageToEnemy(enemy: ActiveEnemy, rawDmg: number, proj: Projectile) {
    const enemyCfg = ENEMY_CONFIGS[enemy.type];
    const armor = enemyCfg ? enemyCfg.armor : 0;
    const finalDmg = Math.max(1, rawDmg * (1 - armor));

    enemy.health -= finalDmg;
    this.stats.damageDealt += finalDmg;

    // Apply slow / frost
    if (proj.slowFactor) {
      enemy.slowTimer = proj.slowDuration || 3.0;
      enemy.slowFactor = proj.slowFactor;
      if (this.currentWeather === 'blizzard' && Math.random() < 0.35) {
        enemy.frozenTimer = 2.0; // Frozen solid!
      }
    }

    // Apply fire burn
    if (proj.damageType === 'fire') {
      enemy.burnTimer = 4.0;
      enemy.burnDamage = 18;
    }
  }

  private finishWave() {
    this.isWaveInProgress = false;

    // Reward (slightly more generous in endless mode to keep momentum)
    const waveRewardMult = this.endlessMode ? 1.4 : 1.0;
    this.resources.aether += Math.round((50 + this.currentWave * 15) * waveRewardMult);
    this.resources.mana += Math.round((25 + this.currentWave * 5) * waveRewardMult);

    // Endless mode scaling: after wave 20, enemies continue scaling up
    if (this.endlessMode) {
      // Endless has no permanent "victory" — only endless survival
    } else if (this.currentWave >= this.totalWaves) {
      this.hasWonStandardRun = true;
      this.handleGameOver(true);
      return;
    }

    // Roguelike Relic Draft: draw 3 random relics not already owned
    const availableRelics = RELIC_POOL.filter((r) => !this.unlockedRelics.some((u) => u.id === r.id));
    if (availableRelics.length > 0 && this.events?.onRelicDraftOpen) {
      // Shuffle & pick 3
      const shuffled = [...availableRelics].sort(() => Math.random() - 0.5);
      const choices = shuffled.slice(0, 3);
      this.events.onRelicDraftOpen(choices);
    }

    if (this.events?.onWaveComplete) {
      this.events.onWaveComplete(this.currentWave);
    }
  }

  public selectRelic(relic: Relic) {
    this.unlockedRelics.push(relic);
    relic.effect(this.gameModifiers);
    soundManager.playClick();
  }

  private handleGameOver(victory: boolean) {
    this.isWaveInProgress = false;
    if (this.events?.onGameOver) {
      this.events.onGameOver(victory);
    }
  }

  // --- Save / Load Slot ---
  public exportSaveSlot(slotId: number): SaveGameSlot {
    return {
      slotId,
      timestamp: Date.now(),
      name: `Wave ${this.currentWave} - ${this.mapData.title}`,
      wave: this.currentWave,
      heartHealth: this.heartHealth,
      maxHeartHealth: this.maxHeartHealth,
      resources: { ...this.resources },
      mapData: JSON.parse(JSON.stringify(this.mapData)),
      placedTowers: JSON.parse(JSON.stringify(this.placedTowers)),
      unlockedRelicIds: this.unlockedRelics.map((r) => r.id),
      totalScore: this.stats.enemiesDefeated * 10 + this.currentWave * 100 + this.stats.bossesSlain * 500,
      gameModifiers: JSON.parse(JSON.stringify(this.gameModifiers)),
    };
  }

  public importSaveSlot(slot: SaveGameSlot) {
    this.currentWave = slot.wave;
    this.heartHealth = slot.heartHealth;
    this.maxHeartHealth = slot.maxHeartHealth;
    this.resources = { ...slot.resources };
    this.mapData = slot.mapData;
    this.placedTowers = slot.placedTowers;
    this.gameModifiers = slot.gameModifiers;

    // Restore relics
    this.unlockedRelics = [];
    slot.unlockedRelicIds.forEach((id) => {
      const relic = RELIC_POOL.find((r) => r.id === id);
      if (relic) this.unlockedRelics.push(relic);
    });

    this.activeEnemies = [];
    this.projectiles = [];
    this.isWaveInProgress = false;
  }
}
