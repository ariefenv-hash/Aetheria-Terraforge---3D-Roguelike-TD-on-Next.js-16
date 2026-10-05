import { GridTile } from '@/types/game';

interface Node {
  x: number;
  z: number;
  height: number;
  g: number;
  h: number;
  f: number;
  parent?: Node;
}

export function findPath(
  tiles: GridTile[],
  width: number,
  depth: number,
  start: { x: number; z: number },
  target: { x: number; z: number },
  isFlying: boolean = false
): { x: number; z: number; height: number }[] {
  // Helper to lookup tile
  const getTile = (x: number, z: number): GridTile | undefined => {
    if (x < 0 || x >= width || z < 0 || z >= depth) return undefined;
    return tiles[z * width + x];
  };

  const targetTile = getTile(target.x, target.z);
  const startTile = getTile(start.x, start.z);

  if (!startTile || !targetTile) return [];

  // Flying units simply take direct straight line interpolated points!
  if (isFlying) {
    const flightPoints: { x: number; z: number; height: number }[] = [];
    const steps = Math.max(Math.abs(target.x - start.x), Math.abs(target.z - start.z)) * 2;
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 1 : i / steps;
      const curX = Math.round(start.x + (target.x - start.x) * t);
      const curZ = Math.round(start.z + (target.z - start.z) * t);
      const tTile = getTile(curX, curZ);
      flightPoints.push({
        x: curX,
        z: curZ,
        height: Math.max(2.2, (tTile ? tTile.height : 1) + 1.2),
      });
    }
    return flightPoints;
  }

  // A* for ground units
  const openSet: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    x: start.x,
    z: start.z,
    height: startTile.height,
    g: 0,
    h: Math.abs(target.x - start.x) + Math.abs(target.z - start.z),
    f: Math.abs(target.x - start.x) + Math.abs(target.z - start.z),
  };

  openSet.push(startNode);

  const neighbors = [
    { dx: 1, dz: 0 },
    { dx: -1, dz: 0 },
    { dx: 0, dz: 1 },
    { dx: 0, dz: -1 },
  ];

  let iterations = 0;
  const maxIterations = 2500;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f
    let bestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[bestIndex].f) {
        bestIndex = i;
      }
    }

    const current = openSet.splice(bestIndex, 1)[0];
    const key = `${current.x},${current.z}`;

    if (current.x === target.x && current.z === target.z) {
      // Reconstruct path
      const path: { x: number; z: number; height: number }[] = [];
      let curr: Node | undefined = current;
      while (curr) {
        path.unshift({ x: curr.x, z: curr.z, height: curr.height });
        curr = curr.parent;
      }
      return path;
    }

    closedSet.add(key);

    for (const { dx, dz } of neighbors) {
      const nx = current.x + dx;
      const nz = current.z + dz;
      const nKey = `${nx},${nz}`;

      if (closedSet.has(nKey)) continue;

      const neighborTile = getTile(nx, nz);
      if (!neighborTile) continue;

      // Obstacle check:
      // If it's the target tile (Heart Core), allow stepping on it regardless of structure
      const isTarget = nx === target.x && nz === target.z;
      if (!isTarget && neighborTile.towerId) {
        // Blocked by tower/barricade
        continue;
      }

      // Height difference check:
      // Can climb up at most 1 level (e.g. 1 -> 2). Climbing up 2 levels (1 -> 3) is a cliff!
      const heightDiff = neighborTile.height - current.height;
      if (heightDiff > 1) {
        // Cliff too high to climb
        continue;
      }
      if (heightDiff < -2) {
        // Drop too steep
        continue;
      }

      // Movement cost
      let cost = 1.0;
      // Climbing uphill has extra movement cost
      if (heightDiff === 1) cost += 0.8;
      // Low trench or mud
      if (neighborTile.height === 0 || neighborTile.type === 'mud') cost += 0.5;
      if (neighborTile.type === 'lava') cost += 2.5; // Avoid lava unless forced

      const gScore = current.g + cost;
      const existingOpen = openSet.find((n) => n.x === nx && n.z === nz);

      if (!existingOpen) {
        const hScore = Math.abs(target.x - nx) + Math.abs(target.z - nz);
        openSet.push({
          x: nx,
          z: nz,
          height: neighborTile.height,
          g: gScore,
          h: hScore,
          f: gScore + hScore,
          parent: current,
        });
      } else if (gScore < existingOpen.g) {
        existingOpen.g = gScore;
        existingOpen.f = gScore + existingOpen.h;
        existingOpen.parent = current;
      }
    }
  }

  // If completely blocked, fallback: allow path through towers with high penalty so enemies don't break
  return findBreachPath(tiles, width, depth, start, target);
}

function findBreachPath(
  tiles: GridTile[],
  width: number,
  depth: number,
  start: { x: number; z: number },
  target: { x: number; z: number }
): { x: number; z: number; height: number }[] {
  const getTile = (x: number, z: number): GridTile | undefined => {
    if (x < 0 || x >= width || z < 0 || z >= depth) return undefined;
    return tiles[z * width + x];
  };

  const openSet: Node[] = [];
  const closedSet = new Set<string>();

  const startTile = getTile(start.x, start.z);
  if (!startTile) return [];

  openSet.push({
    x: start.x,
    z: start.z,
    height: startTile.height,
    g: 0,
    h: Math.abs(target.x - start.x) + Math.abs(target.z - start.z),
    f: Math.abs(target.x - start.x) + Math.abs(target.z - start.z),
  });

  const neighbors = [
    { dx: 1, dz: 0 },
    { dx: -1, dz: 0 },
    { dx: 0, dz: 1 },
    { dx: 0, dz: -1 },
  ];

  let iterations = 0;
  while (openSet.length > 0 && iterations < 3000) {
    iterations++;
    let bestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[bestIndex].f) {
        bestIndex = i;
      }
    }

    const current = openSet.splice(bestIndex, 1)[0];
    if (current.x === target.x && current.z === target.z) {
      const path: { x: number; z: number; height: number }[] = [];
      let curr: Node | undefined = current;
      while (curr) {
        path.unshift({ x: curr.x, z: curr.z, height: curr.height });
        curr = curr.parent;
      }
      return path;
    }

    closedSet.add(`${current.x},${current.z}`);

    for (const { dx, dz } of neighbors) {
      const nx = current.x + dx;
      const nz = current.z + dz;
      if (closedSet.has(`${nx},${nz}`)) continue;

      const neighborTile = getTile(nx, nz);
      if (!neighborTile) continue;

      // In breach mode, towers are passable with high penalty (15.0)
      let cost = 1.0;
      if (neighborTile.towerId) cost += 15.0;
      const heightDiff = Math.abs(neighborTile.height - current.height);
      if (heightDiff > 1) cost += heightDiff * 4.0;

      const gScore = current.g + cost;
      const existing = openSet.find((n) => n.x === nx && n.z === nz);

      if (!existing) {
        const h = Math.abs(target.x - nx) + Math.abs(target.z - nz);
        openSet.push({
          x: nx,
          z: nz,
          height: neighborTile.height,
          g: gScore,
          h,
          f: gScore + h,
          parent: current,
        });
      } else if (gScore < existing.g) {
        existing.g = gScore;
        existing.f = gScore + existing.h;
        existing.parent = current;
      }
    }
  }

  return [];
}
