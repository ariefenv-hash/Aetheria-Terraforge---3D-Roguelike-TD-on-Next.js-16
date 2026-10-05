/**
 * Core type definitions for Aetheria: Terraforge 3D Roguelike TD
 */

export type TerrainType = 'plains' | 'stone' | 'water' | 'lava' | 'crystal' | 'chasm' | 'mud';

export type WeatherType = 'clear' | 'thunderstorm' | 'ashfall' | 'blizzard' | 'miasma';

export interface Resources {
  aether: number;     // 🪨 Earth Aether (Building material)
  mana: number;       // ⚡ Leyline Mana (Energy for towers & active abilities)
  souls: number;      // 🔮 Biomass / Souls (For Roguelike relics & research)
  sparks: number;     // 🔨 Terraforming Sparks (For raising/carving terrain)
}

export interface GridTile {
  x: number;
  z: number;
  height: number;     // 0 = abyss/water/chasm, 1 = plain, 2 = hill, 3 = mesa, 4 = pinnacle
  type: TerrainType;
  towerId?: string;
  hasCrystal?: boolean;
  flowDirection?: 'none' | 'north' | 'south' | 'east' | 'west';
  isWalkable: boolean;
  baseHeight: number;
}

export type TowerType =
  | 'ballista'
  | 'catapult'
  | 'pyromancer'
  | 'arcane_prism'
  | 'cryo_obelisk'
  | 'geomancer'
  | 'mine'
  | 'barricade';

export interface TowerConfig {
  type: TowerType;
  name: string;
  cost: { aether: number; mana: number; sparks?: number };
  description: string;
  range: number;
  damage: number;
  fireRate: number; // Attacks per second
  damageType: 'physical' | 'fire' | 'frost' | 'energy' | 'earth';
  splashRadius?: number;
  slowPercent?: number;
  burnDuration?: number;
  manaDrainPerShot?: number;
  color: string;
  modelType: string;
  elevationBonusRange: number; // bonus per height level
  elevationBonusDmg: number;
  unlocked?: boolean;
}

export interface PlacedTower {
  id: string;
  x: number;
  z: number;
  type: TowerType;
  level: number;
  targetMode: 'first' | 'last' | 'strongest' | 'closest' | 'flying';
  currentCooldown: number;
  totalKills: number;
  totalDamageDealt: number;
  customName?: string;
}

export type EnemyType =
  | 'goblin'
  | 'scout'
  | 'armored_orc'
  | 'gargoyle'      // Flying
  | 'burrower'      // Earth tunneler
  | 'ash_elemental'
  | 'colossus_boss' // Massive boss
  | 'storm_wyrm';   // Flying boss

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  maxHealth: number;
  speed: number;
  armor: number; // % damage reduction
  soulReward: number;
  aetherReward: number;
  isFlying: boolean;
  color: string;
  size: number;
  description: string;
  abilityDesc?: string;
}

export interface ActiveEnemy {
  id: string;
  type: EnemyType;
  maxHealth: number;
  health: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  currentWaypointIndex: number;
  path: { x: number; z: number; height: number }[];
  slowTimer: number;
  slowFactor: number;
  burnTimer: number;
  burnDamage: number;
  frozenTimer: number;
  isFlying: boolean;
  deathProcessed?: boolean;
}

export interface Projectile {
  id: string;
  startX: number;
  startY: number;
  startZ: number;
  currentX: number;
  currentY: number;
  currentZ: number;
  targetEnemyId: string;
  targetPos: { x: number; y: number; z: number };
  speed: number;
  damage: number;
  damageType: 'physical' | 'fire' | 'frost' | 'energy' | 'earth';
  splashRadius: number;
  slowFactor?: number;
  slowDuration?: number;
  color: string;
  arcHeight?: number;
  progress: number; // 0 to 1
}

export interface ParticleEffect {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface Relic {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  icon: string;
  flavor: string;
  effect: (modifiers: GameModifiers) => void;
}

export interface GameModifiers {
  towerDamageMult: Record<TowerType, number>;
  towerRangeMult: Record<TowerType, number>;
  towerCostMult: number;
  terraformingCostMult: number;
  highGroundDmgBonus: number; // Default 0.20 per height above 1
  highGroundRangeBonus: number; // Default 0.25 per height above 1
  trenchBurnMult: number;
  waterConductElectricity: boolean;
  enemiesSlowUphill: number;
  soulYieldMult: number;
  aetherYieldMult: number;
  sparkYieldMult: number;
  wallsReflectDamage: boolean;
  weatherResistance: boolean;
  blizzardShatterChance: number;
}

export interface WaveGroup {
  enemyType: EnemyType;
  count: number;
  interval: number; // seconds between spawns
  delay: number; // start delay in seconds
}

export interface WaveConfig {
  waveNumber: number;
  weather: WeatherType;
  groups: WaveGroup[];
  rewardAether: number;
  rewardMana: number;
  rewardSparks: number;
  loreIntro?: string;
}

export interface MapData {
  id: string;
  title: string;
  description: string;
  width: number;
  depth: number;
  tiles: GridTile[];
  spawns: { x: number; z: number }[];
  heartCore: { x: number; z: number };
  initialAether: number;
  initialMana: number;
  initialSparks: number;
  biome: 'alpine' | 'volcano' | 'marsh' | 'crystal_abyss';
  customWaves?: WaveConfig[];
}

export type TerraformTool =
  | 'inspect'
  | 'elevate'   // +1 height
  | 'lower'     // -1 height
  | 'chasm'     // dig to 0
  | 'channel_lava'
  | 'channel_water'
  | 'flatten'
  | 'demolish';

export interface SaveGameSlot {
  slotId: number;
  timestamp: number;
  name: string;
  wave: number;
  heartHealth: number;
  maxHeartHealth: number;
  resources: Resources;
  mapData: MapData;
  placedTowers: PlacedTower[];
  unlockedRelicIds: string[];
  totalScore: number;
  gameModifiers: GameModifiers;
}

export type Difficulty = 'novice' | 'adept' | 'archmage';

export interface RunConfig {
  biome: 'alpine' | 'volcano' | 'marsh' | 'crystal_abyss';
  difficulty: Difficulty;
  endlessMode: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Returns true if this achievement is unlocked given the cumulative profile. */
  isUnlocked: (profile: PlayerProfile) => boolean;
}

export interface PlayerProfile {
  totalGamesPlayed: number;
  totalVictories: number;
  highestWaveEver: number;
  bossesSlainTotal: number;
  tilesTerraformedTotal: number;
  towersBuiltTotal: number;
  totalScore: number;
  unlockedAchievements: string[];
  /** Track which biome+difficulty combos have been completed. */
  completedRuns: string[];
}

export interface GameStats {
  enemiesDefeated: number;
  damageDealt: number;
  tilesTerraformed: number;
  towersBuilt: number;
  soulsHarvested: number;
  highestWave: number;
  bossesSlain: number;
}
