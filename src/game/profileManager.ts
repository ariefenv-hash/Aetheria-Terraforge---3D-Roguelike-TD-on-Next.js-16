import { Achievement, PlayerProfile } from '@/types/game';

/**
 * Persistent player profile stored in localStorage. Tracks long-term
 * progression across all runs — unlocks achievements, records best runs,
 * and feeds the meta-progression layer.
 */
const PROFILE_KEY = 'aetheria_profile_v1';

const DEFAULT_PROFILE: PlayerProfile = {
  totalGamesPlayed: 0,
  totalVictories: 0,
  highestWaveEver: 0,
  bossesSlainTotal: 0,
  tilesTerraformedTotal: 0,
  towersBuiltTotal: 0,
  totalScore: 0,
  unlockedAchievements: [],
  completedRuns: [],
};

/**
 * All unlockable achievements. The `isUnlocked` predicate uses a fresh
 * snapshot of the player profile at evaluation time.
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    name: '初阵告捷 (First Blood)',
    description: '完成你的第一波防御。',
    icon: '🗡️',
    isUnlocked: (p) => p.totalGamesPlayed >= 1,
  },
  {
    id: 'archmage_victory',
    name: '大法师之证 (Archmage\'s Trial)',
    description: '在「大法师」难度下取得完整胜利。',
    icon: '🔮',
    isUnlocked: (p) => p.completedRuns.some((r) => r.endsWith(':archmage')),
  },
  {
    id: 'iron_defender',
    name: '铁壁坚守者 (Iron Defender)',
    description: '地脉核心剩余血量 ≥ 80% 通关。',
    icon: '🛡️',
    isUnlocked: (p) => p.completedRuns.some((r) => r.includes('iron')),
  },
  {
    id: 'terraform_master',
    name: '地貌大师 (Terraform Master)',
    description: '累计重塑地块 500 次。',
    icon: '⛰️',
    isUnlocked: (p) => p.tilesTerraformedTotal >= 500,
  },
  {
    id: 'boss_slayer',
    name: '屠魔巨擘 (Boss Slayer)',
    description: '累计击杀 20 只首领。',
    icon: '🐲',
    isUnlocked: (p) => p.bossesSlainTotal >= 20,
  },
  {
    id: 'endless_xv',
    name: '永夜守望者 (Eternal Watchman)',
    description: '在无尽模式中坚持至第 30 波。',
    icon: '♾️',
    isUnlocked: (p) => p.highestWaveEver >= 30,
  },
  {
    id: 'all_biomes',
    name: '万象开拓者 (Pathfinder of Realms)',
    description: '在四种生物群落中各完成一次胜利。',
    icon: '🌍',
    isUnlocked: (p) => {
      const biomes = new Set(
        p.completedRuns
          .filter((r) => !r.endsWith(':defeat'))
          .map((r) => r.split(':')[0]),
      );
      return biomes.size >= 4;
    },
  },
  {
    id: 'score_grandmaster',
    name: '万世宗师 (Grandmaster)',
    description: '累计获得 50,000 分数。',
    icon: '👑',
    isUnlocked: (p) => p.totalScore >= 50000,
  },
];

class ProfileManager {
  private cache: PlayerProfile | null = null;

  /** Load profile from localStorage (or create default). */
  public load(): PlayerProfile {
    if (this.cache) return this.cache;
    if (typeof window === 'undefined') {
      this.cache = { ...DEFAULT_PROFILE };
      return this.cache;
    }
    try {
      const raw = window.localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.cache = { ...DEFAULT_PROFILE, ...parsed };
      } else {
        this.cache = { ...DEFAULT_PROFILE };
      }
    } catch {
      this.cache = { ...DEFAULT_PROFILE };
    }
    return this.cache;
  }

  public save(profile: PlayerProfile) {
    if (typeof window === 'undefined') return;
    this.cache = profile;
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // ignore quota errors
    }
  }

  /** Merge a run summary into the profile, return the freshly-unlocked
   * achievement ids (so the UI can toast them). */
  public recordRun(summary: {
    victory: boolean;
    wave: number;
    bossesSlain: number;
    tilesTerraformed: number;
    towersBuilt: number;
    score: number;
    biome: string;
    difficulty: string;
    ironDefender?: boolean;
  }): Achievement[] {
    const profile = this.load();
    profile.totalGamesPlayed += 1;
    if (summary.victory) {
      profile.totalVictories += 1;
      const tag = `${summary.biome}:${summary.difficulty}${
        summary.ironDefender ? ':iron' : ''
      }`;
      if (!profile.completedRuns.includes(tag)) {
        profile.completedRuns.push(tag);
      }
    } else {
      // mark as defeat for biome-tracker filter
      const tag = `${summary.biome}:defeat`;
      if (!profile.completedRuns.includes(tag)) {
        profile.completedRuns.push(tag);
      }
    }
    profile.highestWaveEver = Math.max(profile.highestWaveEver, summary.wave);
    profile.bossesSlainTotal += summary.bossesSlain;
    profile.tilesTerraformedTotal += summary.tilesTerraformed;
    profile.towersBuiltTotal += summary.towersBuilt;
    profile.totalScore += summary.score;

    // Check for newly-unlocked achievements
    const newlyUnlocked: Achievement[] = [];
    for (const ach of ACHIEVEMENTS) {
      if (!profile.unlockedAchievements.includes(ach.id) && ach.isUnlocked(profile)) {
        profile.unlockedAchievements.push(ach.id);
        newlyUnlocked.push(ach);
      }
    }

    this.save(profile);
    return newlyUnlocked;
  }

  public reset() {
    this.save({ ...DEFAULT_PROFILE });
  }
}

export const profileManager = new ProfileManager();
