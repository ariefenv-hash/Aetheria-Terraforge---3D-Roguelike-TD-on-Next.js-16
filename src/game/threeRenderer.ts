import * as THREE from 'three';
import { ActiveEnemy, GridTile, PlacedTower, Projectile, WeatherType } from '@/types/game';
import { TOWER_CONFIGS, WEATHER_CONFIGS } from './gameData';

export class ThreeRenderer {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private reqId: number | null = null;

  // Lighting & Weather
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private weatherParticles: THREE.Points | null = null;
  private lightningLight: THREE.PointLight;
  private nextLightningTime: number = 0;

  // Scene object groups
  private terrainGroup: THREE.Group;
  private structuresGroup: THREE.Group;
  private enemiesGroup: THREE.Group;
  private projectilesGroup: THREE.Group;
  private cursorGroup: THREE.Group;
  private coreMesh: THREE.Group | null = null;
  private spawnMeshes: THREE.Group[] = [];

  // Map representation cache
  private tileMeshes: Map<string, THREE.Mesh> = new Map();
  private towerMeshes: Map<string, THREE.Group> = new Map();
  private enemyMeshes: Map<string, THREE.Group> = new Map();
  private projectileMeshes: Map<string, THREE.Mesh> = new Map();

  // Raycasting & Interaction
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(-1000, -1000);
  private hoveredTile: { x: number; z: number } | null = null;
  private cursorMesh: THREE.Mesh;
  private rangeIndicatorMesh: THREE.Mesh;

  // Camera Orbit State
  public cameraTarget = new THREE.Vector3(8, 0, 8);
  public cameraDistance = 22;
  public cameraPitch = 0.85; // radians (tilt)
  public cameraYaw = 0.75; // radians (orbit around Y)
  private isDragging = false;
  private isPanning = false;
  private lastMousePos = { x: 0, y: 0 };
  private touchStartDist = 0;

  // Event callbacks
  public onTileClick?: (x: number, z: number, shiftHeld: boolean) => void;
  public onTileHover?: (tile: GridTile | null) => void;

  private currentGridWidth = 16;
  private currentGridDepth = 16;
  private tilesCache: GridTile[] = [];
  private currentWeather: WeatherType = 'clear';

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#100e0b');
    this.scene.fog = new THREE.FogExp2('#100e0b', 0.012);

    // 2. Camera
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 120);
    this.updateCameraTransform();

    // 3. Renderer with antialiasing and shadow maps
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. Lights
    this.ambientLight = new THREE.AmbientLight(0xffecd0, 0.9);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff5e6, 1.3);
    this.dirLight.position.set(16, 28, 12);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 70;
    this.dirLight.shadow.camera.left = -20;
    this.dirLight.shadow.camera.right = 20;
    this.dirLight.shadow.camera.top = 20;
    this.dirLight.shadow.camera.bottom = -20;
    this.scene.add(this.dirLight);

    // Lightning point light
    this.lightningLight = new THREE.PointLight(0x99ccff, 0, 50);
    this.lightningLight.position.set(8, 15, 8);
    this.scene.add(this.lightningLight);

    // 5. Groups
    this.terrainGroup = new THREE.Group();
    this.structuresGroup = new THREE.Group();
    this.enemiesGroup = new THREE.Group();
    this.projectilesGroup = new THREE.Group();
    this.cursorGroup = new THREE.Group();

    this.scene.add(this.terrainGroup);
    this.scene.add(this.structuresGroup);
    this.scene.add(this.enemiesGroup);
    this.scene.add(this.projectilesGroup);
    this.scene.add(this.cursorGroup);

    // 6. Cursor highlight
    const cursorGeo = new THREE.BoxGeometry(0.96, 0.12, 0.96);
    const cursorMat = new THREE.MeshBasicMaterial({
      color: 0xecd078,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    this.cursorMesh = new THREE.Mesh(cursorGeo, cursorMat);
    this.cursorMesh.visible = false;
    this.cursorGroup.add(this.cursorMesh);

    // Range preview circle
    const rangeGeo = new THREE.RingGeometry(0.1, 1, 32);
    rangeGeo.rotateX(-Math.PI / 2);
    const rangeMat = new THREE.MeshBasicMaterial({
      color: 0xe6a838,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    this.rangeIndicatorMesh = new THREE.Mesh(rangeGeo, rangeMat);
    this.rangeIndicatorMesh.visible = false;
    this.cursorGroup.add(this.rangeIndicatorMesh);

    // 7. Event listeners
    this.setupControls();
    window.addEventListener('resize', this.onResize);

    // 8. Start loop
    this.animate();
  }

  private updateCameraTransform() {
    // Spherical to Cartesian relative to cameraTarget
    const x = this.cameraTarget.x + this.cameraDistance * Math.cos(this.cameraPitch) * Math.sin(this.cameraYaw);
    const y = this.cameraTarget.y + this.cameraDistance * Math.sin(this.cameraPitch);
    const z = this.cameraTarget.z + this.cameraDistance * Math.cos(this.cameraPitch) * Math.cos(this.cameraYaw);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private setupControls() {
    const dom = this.renderer.domElement;

    // Prevent native context menu so right-click can be used for cancel
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse move for raycasting & camera orbit
    dom.addEventListener('pointerdown', (e) => {
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      if (e.button === 0) {
        this.isDragging = true;
      } else if (e.button === 2 || e.button === 1) {
        this.isPanning = true;
      }
    });

    dom.addEventListener('pointermove', (e) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.lastMousePos = { x: e.clientX, y: e.clientY };

      if (this.isDragging) {
        // Orbit
        this.cameraYaw -= dx * 0.007;
        this.cameraPitch = Math.max(0.2, Math.min(1.45, this.cameraPitch + dy * 0.007));
        this.updateCameraTransform();
      } else if (this.isPanning) {
        // Pan parallel to camera view
        const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
        const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
        this.cameraTarget.addScaledVector(right, -dx * 0.02);
        this.cameraTarget.addScaledVector(forward, dy * 0.02);
        this.updateCameraTransform();
      }

      this.checkRaycast();
    });

    window.addEventListener('pointerup', (e) => {
      if (this.isDragging && Math.abs(e.clientX - this.lastMousePos.x) < 3 && Math.abs(e.clientY - this.lastMousePos.y) < 3) {
        // Simple click without substantial drag
        if (this.hoveredTile && this.onTileClick) {
          this.onTileClick(this.hoveredTile.x, this.hoveredTile.z, e.shiftKey);
        }
      }
      this.isDragging = false;
      this.isPanning = false;
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(8, Math.min(45, this.cameraDistance + e.deltaY * 0.025));
      this.updateCameraTransform();
    }, { passive: false });

    // Touch support for mobile pinch zoom
    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.touchStartDist = Math.sqrt(dx * dx + dy * dy);
      }
    });

    dom.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = (this.touchStartDist - dist) * 0.05;
        this.cameraDistance = Math.max(8, Math.min(45, this.cameraDistance + delta));
        this.touchStartDist = dist;
        this.updateCameraTransform();
      }
    });

    // Disable right click context menu on canvas
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private checkRaycast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(Array.from(this.tileMeshes.values()), false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      const tileData = mesh.userData as GridTile;
      if (tileData) {
        this.hoveredTile = { x: tileData.x, z: tileData.z };
        this.cursorMesh.visible = true;
        this.cursorMesh.position.set(tileData.x, tileData.height * 0.55 + 0.06, tileData.z);

        if (this.onTileHover) {
          const tile = this.tilesCache[tileData.z * this.currentGridWidth + tileData.x] || null;
          this.onTileHover(tile);
        }
        return;
      }
    }

    this.cursorMesh.visible = false;
    this.hoveredTile = null;
    if (this.onTileHover) {
      this.onTileHover(null);
    }
  }

  public setRangePreview(range: number, x: number, z: number, height: number) {
    if (range <= 0) {
      this.rangeIndicatorMesh.visible = false;
      return;
    }
    this.rangeIndicatorMesh.visible = true;
    this.rangeIndicatorMesh.scale.set(range, range, 1);
    this.rangeIndicatorMesh.position.set(x, height * 0.55 + 0.08, z);
  }

  public hideRangePreview() {
    this.rangeIndicatorMesh.visible = false;
  }

  public resetCameraView(isometric: boolean = true) {
    this.cameraTarget.set(this.currentGridWidth / 2, 0.5, this.currentGridDepth / 2);
    if (isometric) {
      this.cameraPitch = 0.85;
      this.cameraYaw = 0.75;
      this.cameraDistance = 22;
    } else {
      // Top down tactical view
      this.cameraPitch = 1.45;
      this.cameraYaw = 0;
      this.cameraDistance = 24;
    }
    this.updateCameraTransform();
  }

  // --- Terrain Construction ---
  public buildTerrain(
    tiles: GridTile[],
    width: number,
    depth: number,
    spawns: { x: number; z: number }[],
    heartCore: { x: number; z: number },
    biome: string
  ) {
    this.currentGridWidth = width;
    this.currentGridDepth = depth;
    this.tilesCache = tiles;

    // Clear old meshes
    while (this.terrainGroup.children.length > 0) {
      const obj = this.terrainGroup.children[0];
      this.terrainGroup.remove(obj);
    }
    this.tileMeshes.clear();
    this.spawnMeshes = [];

    // Base plate (Dark antique stone base)
    const baseGeo = new THREE.BoxGeometry(width + 1.2, 0.8, depth + 1.2);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1d1712,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set((width - 1) / 2, -0.45, (depth - 1) / 2);
    baseMesh.receiveShadow = true;
    this.terrainGroup.add(baseMesh);

    // Build each tile as stylized low-poly pillar
    tiles.forEach((tile) => {
      const mesh = this.createTileMesh(tile, biome);
      this.terrainGroup.add(mesh);
      this.tileMeshes.set(`${tile.x},${tile.z}`, mesh);
    });

    // Build Heart Core structure
    this.buildHeartCore(heartCore.x, heartCore.z, tiles[heartCore.z * width + heartCore.x]?.height || 1);

    // Build Spawn Portals
    spawns.forEach((spawn) => {
      this.buildSpawnPortal(spawn.x, spawn.z, tiles[spawn.z * width + spawn.x]?.height || 1);
    });

    this.resetCameraView();
  }

  private createTileMesh(tile: GridTile, biome: string): THREE.Mesh {
    const heightScale = 0.55;
    const meshHeight = Math.max(0.12, tile.height * heightScale);
    const geo = new THREE.BoxGeometry(0.94, meshHeight, 0.94);

    let color = 0x5a7042; // default plains green
    let roughness = 0.85;
    let metalness = 0.05;
    let emissive = 0x000000;

    switch (tile.type) {
      case 'stone':
        color = biome === 'volcano' ? 0x332822 : 0x7a746c;
        roughness = 0.9;
        break;
      case 'water':
        color = 0x2b6ca8;
        roughness = 0.2;
        metalness = 0.25;
        break;
      case 'lava':
        color = 0xdc3818;
        emissive = 0x992200;
        roughness = 0.3;
        break;
      case 'chasm':
        color = 0x140f0c;
        roughness = 0.95;
        break;
      case 'mud':
        color = 0x483c2c;
        roughness = 0.95;
        break;
      case 'crystal':
        color = 0x794bc4;
        emissive = 0x281050;
        roughness = 0.2;
        metalness = 0.4;
        break;
      default:
        // plains / grass
        color = biome === 'volcano' ? 0x614838 : (biome === 'marsh' ? 0x475e3c : 0x5d7343);
    }

    // Height tinting: higher ground has rocky cliff accents
    if (tile.height >= 3 && tile.type === 'plains') {
      color = 0x827d74; // high mountain stone top
    }

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(tile.x, meshHeight / 2, tile.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { ...tile };

    // If tile has crystal vein, add small crystal cluster
    if (tile.hasCrystal) {
      const crystalGeo = new THREE.OctahedronGeometry(0.22, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x9e5cf7,
        emissive: 0x4f179c,
        roughness: 0.1,
        metalness: 0.6,
        flatShading: true,
      });
      const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
      crystalMesh.position.set(0, meshHeight / 2 + 0.16, 0);
      crystalMesh.scale.set(0.7, 1.3, 0.7);
      mesh.add(crystalMesh);
    }

    return mesh;
  }

  public updateTile(tile: GridTile, biome: string) {
    const key = `${tile.x},${tile.z}`;
    const oldMesh = this.tileMeshes.get(key);
    if (oldMesh) {
      this.terrainGroup.remove(oldMesh);
    }
    const newMesh = this.createTileMesh(tile, biome);
    this.terrainGroup.add(newMesh);
    this.tileMeshes.set(key, newMesh);
  }

  // --- Heart Core & Spawns ---
  private buildHeartCore(x: number, z: number, height: number) {
    if (this.coreMesh) {
      this.terrainGroup.remove(this.coreMesh);
    }
    const group = new THREE.Group();
    const yPos = height * 0.55;

    // Pedestal
    const baseGeo = new THREE.CylinderGeometry(0.42, 0.5, 0.35, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.8, flatShading: true });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, 0.18, 0);
    group.add(baseMesh);

    // Glowing core crystal
    const orbGeo = new THREE.IcosahedronGeometry(0.3, 0);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xe6a838,
      emissive: 0xff9900,
      roughness: 0.1,
      metalness: 0.5,
      flatShading: true,
    });
    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    orbMesh.position.set(0, 0.55, 0);
    orbMesh.name = 'coreOrb';
    group.add(orbMesh);

    // Rotating ring
    const ringGeo = new THREE.TorusGeometry(0.42, 0.03, 6, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 0.55, 0);
    ringMesh.name = 'coreRing';
    group.add(ringMesh);

    group.position.set(x, yPos, z);
    this.coreMesh = group;
    this.terrainGroup.add(group);
  }

  private buildSpawnPortal(x: number, z: number, height: number) {
    const group = new THREE.Group();
    const yPos = height * 0.55;

    // Portal arch
    const archGeo = new THREE.TorusGeometry(0.4, 0.08, 6, 12, Math.PI);
    const archMat = new THREE.MeshStandardMaterial({ color: 0x3a2233, roughness: 0.9, flatShading: true });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(0, 0.4, 0);
    arch.rotation.z = Math.PI;
    group.add(arch);

    // Inner vortex
    const vortexGeo = new THREE.CircleGeometry(0.32, 8);
    const vortexMat = new THREE.MeshBasicMaterial({
      color: 0x902868,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const vortex = new THREE.Mesh(vortexGeo, vortexMat);
    vortex.position.set(0, 0.4, 0);
    group.add(vortex);

    group.position.set(x, yPos, z);
    this.spawnMeshes.push(group);
    this.terrainGroup.add(group);
  }

  // --- Towers ---
  public updateTowers(towers: PlacedTower[], tiles: GridTile[]) {
    // Retain or rebuild tower meshes
    const currentIds = new Set(towers.map((t) => t.id));

    // Remove deleted towers
    this.towerMeshes.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        this.structuresGroup.remove(mesh);
        this.towerMeshes.delete(id);
      }
    });

    // Add or update
    towers.forEach((tower) => {
      if (!this.towerMeshes.has(tower.id)) {
        const tile = tiles[tower.z * this.currentGridWidth + tower.x];
        const h = tile ? tile.height : 1;
        const mesh = this.createTowerMesh(tower, h);
        this.structuresGroup.add(mesh);
        this.towerMeshes.set(tower.id, mesh);
      }
    });
  }

  private createTowerMesh(tower: PlacedTower, height: number): THREE.Group {
    const group = new THREE.Group();
    const yPos = height * 0.55;
    const cfg = TOWER_CONFIGS[tower.type];

    switch (tower.type) {
      case 'ballista': {
        // Wooden stand + cross turret
        const stand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.35, 0.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x5c4033, flatShading: true })
        );
        stand.position.y = 0.2;
        group.add(stand);

        const turret = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.12, 0.2),
          new THREE.MeshStandardMaterial({ color: 0x8b5a2b, flatShading: true })
        );
        turret.position.y = 0.45;
        group.add(turret);
        break;
      }
      case 'catapult': {
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.25, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x4a3525, flatShading: true })
        );
        frame.position.y = 0.15;
        group.add(frame);

        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.5, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x785233, flatShading: true })
        );
        arm.position.set(0, 0.45, -0.1);
        arm.rotation.x = -0.4;
        group.add(arm);
        break;
      }
      case 'pyromancer': {
        const cauldron = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.25, 0.45, 8),
          new THREE.MeshStandardMaterial({ color: 0x2e1f18, metalness: 0.3, flatShading: true })
        );
        cauldron.position.y = 0.225;
        group.add(cauldron);

        const fire = new THREE.Mesh(
          new THREE.TetrahedronGeometry(0.2, 0),
          new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff2200, flatShading: true })
        );
        fire.position.y = 0.52;
        group.add(fire);
        break;
      }
      case 'arcane_prism': {
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(0.3, 0.5, 6),
          new THREE.MeshStandardMaterial({ color: 0x221a2e, flatShading: true })
        );
        spire.position.y = 0.25;
        group.add(spire);

        const prism = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.22, 0),
          new THREE.MeshStandardMaterial({ color: 0xaa55ff, emissive: 0x7722cc, metalness: 0.5, flatShading: true })
        );
        prism.position.y = 0.65;
        prism.name = 'prism';
        group.add(prism);
        break;
      }
      case 'cryo_obelisk': {
        const obelisk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.32, 0.7, 5),
          new THREE.MeshStandardMaterial({ color: 0x70c5e8, emissive: 0x1f5778, flatShading: true })
        );
        obelisk.position.y = 0.35;
        group.add(obelisk);
        break;
      }
      case 'geomancer': {
        const bastion = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.5, 0.65),
          new THREE.MeshStandardMaterial({ color: 0x634b35, flatShading: true })
        );
        bastion.position.y = 0.25;
        group.add(bastion);
        break;
      }
      case 'mine': {
        const gear = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.2, 8),
          new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.6, flatShading: true })
        );
        gear.position.y = 0.25;
        group.add(gear);
        break;
      }
      case 'barricade':
      default: {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(0.85, 0.6, 0.85),
          new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.9, flatShading: true })
        );
        wall.position.y = 0.3;
        group.add(wall);
        break;
      }
    }

    group.position.set(tower.x, yPos, tower.z);
    group.castShadow = true;
    return group;
  }

  // --- Enemies ---
  public updateEnemies(enemies: ActiveEnemy[]) {
    const currentIds = new Set(enemies.map((e) => e.id));

    // Remove dead
    this.enemyMeshes.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        this.enemiesGroup.remove(mesh);
        this.enemyMeshes.delete(id);
      }
    });

    // Update positions & health bars
    enemies.forEach((enemy) => {
      let mesh = this.enemyMeshes.get(enemy.id);
      if (!mesh) {
        mesh = this.createEnemyMesh(enemy);
        this.enemiesGroup.add(mesh);
        this.enemyMeshes.set(enemy.id, mesh);
      }

      mesh.position.set(enemy.x, enemy.y, enemy.z);

      // Update health bar scale
      const hpBar = mesh.getObjectByName('hpBar');
      if (hpBar) {
        const ratio = Math.max(0, enemy.health / enemy.maxHealth);
        hpBar.scale.set(ratio, 1, 1);
        hpBar.position.x = (ratio - 1) * 0.25;
      }
    });
  }

  private createEnemyMesh(enemy: ActiveEnemy): THREE.Group {
    const group = new THREE.Group();
    const isBoss = enemy.type === 'colossus_boss' || enemy.type === 'storm_wyrm';
    const radius = isBoss ? 0.65 : 0.28;

    let bodyGeo: THREE.BufferGeometry;
    let bodyMat: THREE.Material;

    if (enemy.isFlying) {
      bodyGeo = new THREE.ConeGeometry(radius, radius * 1.5, 5);
      bodyGeo.rotateX(Math.PI / 2);
      bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d305b, flatShading: true });
    } else if (isBoss) {
      bodyGeo = new THREE.DodecahedronGeometry(radius, 0);
      bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.9, flatShading: true });
    } else {
      bodyGeo = new THREE.DodecahedronGeometry(radius, 0);
      bodyMat = new THREE.MeshStandardMaterial({ color: 0x5a8a3a, flatShading: true });
    }

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = radius + 0.05;
    body.castShadow = true;
    group.add(body);

    // Health bar container
    const hpBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide })
    );
    hpBg.position.set(0, radius * 2 + 0.25, 0);

    const hpBar = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x32cd32, side: THREE.DoubleSide })
    );
    hpBar.name = 'hpBar';
    hpBar.position.set(0, radius * 2 + 0.25, 0.001);

    group.add(hpBg);
    group.add(hpBar);

    return group;
  }

  // --- Projectiles ---
  public updateProjectiles(projectiles: Projectile[]) {
    const currentIds = new Set(projectiles.map((p) => p.id));

    this.projectileMeshes.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        this.projectilesGroup.remove(mesh);
        this.projectileMeshes.delete(id);
      }
    });

    projectiles.forEach((proj) => {
      let mesh = this.projectileMeshes.get(proj.id);
      if (!mesh) {
        const geo = proj.damageType === 'earth'
          ? new THREE.DodecahedronGeometry(0.18, 0)
          : new THREE.SphereGeometry(0.1, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: proj.color });
        mesh = new THREE.Mesh(geo, mat);
        this.projectilesGroup.add(mesh);
        this.projectileMeshes.set(proj.id, mesh);
      }
      mesh.position.set(proj.currentX, proj.currentY, proj.currentZ);
    });
  }

  // --- Weather System ---
  public setWeather(weather: WeatherType) {
    this.currentWeather = weather;
    const cfg = WEATHER_CONFIGS[weather];

    // Update lights & fog
    this.ambientLight.intensity = cfg.ambientLight;
    this.scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity);
    this.scene.background = new THREE.Color(cfg.fogColor);

    // Weather particles
    if (this.weatherParticles) {
      this.scene.remove(this.weatherParticles);
      this.weatherParticles = null;
    }

    if (weather !== 'clear') {
      const particleCount = weather === 'thunderstorm' ? 1200 : (weather === 'blizzard' ? 1500 : 700);
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount * 3; i += 3) {
        pos[i] = (Math.random() - 0.5) * 35 + this.currentGridWidth / 2;
        pos[i + 1] = Math.random() * 20;
        pos[i + 2] = (Math.random() - 0.5) * 35 + this.currentGridDepth / 2;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

      let pColor = 0x88bbff;
      if (weather === 'ashfall') pColor = 0xff5533;
      if (weather === 'blizzard') pColor = 0xeef5fc;
      if (weather === 'miasma') pColor = 0xaa66cc;

      const mat = new THREE.PointsMaterial({
        color: pColor,
        size: weather === 'blizzard' ? 0.22 : 0.14,
        transparent: true,
        opacity: 0.65,
      });

      this.weatherParticles = new THREE.Points(geo, mat);
      this.scene.add(this.weatherParticles);
    }
  }

  // --- Main Animation Loop ---
  private animate = () => {
    this.reqId = requestAnimationFrame(this.animate);

    // Rotate core crystal
    if (this.coreMesh) {
      const orb = this.coreMesh.getObjectByName('coreOrb');
      const ring = this.coreMesh.getObjectByName('coreRing');
      if (orb) orb.rotation.y += 0.02;
      if (ring) {
        ring.rotation.x += 0.015;
        ring.rotation.z += 0.01;
      }
    }

    // Rotate arcane prisms
    this.towerMeshes.forEach((t) => {
      const prism = t.getObjectByName('prism');
      if (prism) prism.rotation.y += 0.035;
    });

    // Make enemy health bars face the camera
    this.enemyMeshes.forEach((m) => {
      m.children.forEach((child) => {
        if (child.name === 'hpBar' || child.type === 'Mesh') {
          // Billboarding
          child.quaternion.copy(this.camera.quaternion);
        }
      });
    });

    // Animate weather particles falling
    if (this.weatherParticles) {
      const pos = this.weatherParticles.geometry.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        let y = pos.getY(i);
        const speed = this.currentWeather === 'thunderstorm' ? 0.35 : (this.currentWeather === 'blizzard' ? 0.12 : 0.06);
        y -= speed;
        if (y < 0) y = 20;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;

      // Thunderstorm random lightning flash
      if (this.currentWeather === 'thunderstorm') {
        const now = performance.now();
        if (now > this.nextLightningTime) {
          this.lightningLight.intensity = 2.5;
          setTimeout(() => {
            this.lightningLight.intensity = 0;
          }, 80);
          this.nextLightningTime = now + 4000 + Math.random() * 6000;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy() {
    if (this.reqId) cancelAnimationFrame(this.reqId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
