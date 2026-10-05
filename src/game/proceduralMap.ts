import { GridTile, MapData, TerrainType } from '@/types/game';

// Simple mulberry32 PRNG for deterministic seeds
export function createPRNG(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateProceduralMap(
  biome: 'alpine' | 'volcano' | 'marsh' | 'crystal_abyss' = 'alpine',
  seed: number = Math.floor(Math.random() * 1000000),
  width: number = 16,
  depth: number = 16
): MapData {
  const rand = createPRNG(seed);

  const tiles: GridTile[] = [];

  // Heart Core location (towards upper right or center right)
  const heartCore = {
    x: width - 3,
    z: Math.floor(depth / 2),
  };

  // 1 or 2 Spawn portals on the left/lower left
  const spawns = [
    { x: 1, z: 2 },
    { x: 1, z: depth - 3 },
  ];

  // Generate base heightmap using multi-octave sine/pseudo-noise
  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      // Distance from center
      const nx = (x / width) * 2 - 1;
      const nz = (z / depth) * 2 - 1;
      const distFromCenter = Math.sqrt(nx * nx + nz * nz);

      // Noise samples
      const n1 = Math.sin(x * 0.4 + rand() * 0.5) * Math.cos(z * 0.4 + rand() * 0.5);
      const n2 = Math.sin(x * 0.8 + z * 0.8);
      const elevationVal = (n1 * 0.7 + n2 * 0.3 + distFromCenter * 0.3);

      let height = 1;
      if (elevationVal > 0.55) height = 3;
      else if (elevationVal > 0.15) height = 2;
      else if (elevationVal < -0.45) height = 0;

      // Determine terrain type based on biome and height
      let type: TerrainType = 'plains';
      let hasCrystal = false;

      if (biome === 'volcano') {
        if (height === 0) type = rand() > 0.3 ? 'lava' : 'stone';
        else if (height >= 3) type = 'stone';
        else type = rand() > 0.7 ? 'stone' : 'plains';
      } else if (biome === 'marsh') {
        if (height === 0) type = 'water';
        else if (height === 1 && rand() > 0.5) type = 'mud';
        else type = 'plains';
      } else if (biome === 'crystal_abyss') {
        if (height === 0) type = 'chasm';
        else if (height >= 2 && rand() > 0.6) {
          type = 'crystal';
          hasCrystal = true;
        } else type = 'stone';
      } else {
        // Alpine
        if (height === 0) type = 'water';
        else if (height >= 3) type = 'stone';
        else type = 'plains';
      }

      // Occasional resource crystal vein
      if (!hasCrystal && height >= 2 && rand() > 0.82) {
        hasCrystal = true;
      }

      tiles.push({
        x,
        z,
        height,
        baseHeight: height,
        type,
        hasCrystal,
        isWalkable: height > 0 && type !== 'chasm',
      });
    }
  }

  // Ensure heart core and spawns are walkable height 1 ground
  const setTile = (tx: number, tz: number, h: number, t: TerrainType) => {
    const tile = tiles[tz * width + tx];
    if (tile) {
      tile.height = h;
      tile.baseHeight = h;
      tile.type = t;
      tile.isWalkable = true;
      tile.hasCrystal = false;
    }
  };

  setTile(heartCore.x, heartCore.z, 1, 'stone');
  // Clear surrounding core
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const tx = heartCore.x + dx;
      const tz = heartCore.z + dz;
      if (tx >= 0 && tx < width && tz >= 0 && tz < depth) {
        setTile(tx, tz, 1, 'stone');
      }
    }
  }

  spawns.forEach((spawn) => {
    setTile(spawn.x, spawn.z, 1, 'plains');
    setTile(spawn.x + 1, spawn.z, 1, 'plains');
  });

  const biomeTitles = {
    alpine: '高山之冠·碎石堡垒 (Alpine Citadel)',
    volcano: '炽热炼狱·黑曜石峡 (Volcanic Caldera)',
    marsh: '死寂沼泽·低地迷雾 (Misty Fenlands)',
    crystal_abyss: '群星裂隙·源石圣殿 (Crystal Abyss)',
  };

  const biomeDescs = {
    alpine: '山峦叠嶂，制高点优势显著。利用悬崖居高临下重创敌军。',
    volcano: '地热奔腾。巧妙开凿地沟将熔岩引入魔物必经之路！',
    marsh: '泥泞沼泽与浅滩纵横，暴雨降临时雷电可顺着水流传导。',
    crystal_abyss: '深渊悬崖深不见底，蕴含充沛地脉晶石能量。',
  };

  return {
    id: `map_${seed}_${biome}`,
    title: biomeTitles[biome],
    description: biomeDescs[biome],
    width,
    depth,
    tiles,
    spawns,
    heartCore,
    initialAether: 180,
    initialMana: 60,
    initialSparks: 6,
    biome,
  };
}
