/**
 * OCC Live - District Scene Loader (Part 8)
 * Handles async loading and unloading of district scene assets.
 * Only loads districts when a player enters; unloads when empty.
 *
 * Design:
 * - Lazy-loads district GLB assets on portal entry
 * - Tracks load state per district
 * - Unloads inactive districts to conserve memory
 * - Never loads all districts simultaneously
 * - Graceful error handling (failed load does not crash app)
 * - Supports preload hints for upcoming district transitions
 * - No PII collected during load operations
 */

import * as THREE from 'three';
import type {
  DistrictConfig,
  AssetEntry,
  ZoneConfig,
  InteractionConfig,
  SpawnPointConfig,
  AudioZoneConfig,
  NPCConfig,
  Vec3,
} from '../types/index.ts';

// ─── Load States ─────────────────────────────────────────────────────────────

export type DistrictLoadState =
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'error'
  | 'unloading';

export interface DistrictLoadStatus {
  districtId: string;
  state: DistrictLoadState;
  progress: number; // 0-1
  error: string | null;
  loadedAt: number | null;
  assetCount: number;
  loadedAssets: number;
}

// ─── Loaded District Scene ───────────────────────────────────────────────────

export interface LoadedDistrictScene {
  districtId: string;
  /** Root scene group containing all district objects */
  rootGroup: THREE.Group;
  /** Individual loaded meshes keyed by asset ID */
  meshes: Map<string, THREE.Object3D>;
  /** District configuration snapshot */
  config: DistrictConfig;
  /** Timestamp when loaded */
  loadedAt: number;
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface DistrictLoaderCallbacks {
  onLoadStarted?: (districtId: string) => void;
  onLoadProgress?: (districtId: string, progress: number) => void;
  onLoadComplete?: (districtId: string, scene: LoadedDistrictScene) => void;
  onLoadError?: (districtId: string, error: string) => void;
  onUnloaded?: (districtId: string) => void;
}

// ─── District Loader ─────────────────────────────────────────────────────────

export class DistrictLoader {
  private scene: THREE.Scene;
  private loadStates: Map<string, DistrictLoadStatus> = new Map();
  private loadedScenes: Map<string, LoadedDistrictScene> = new Map();
  private callbacks: DistrictLoaderCallbacks = {};
  private maxConcurrentLoads: number = 2;
  private activeLoads: number = 0;
  private loadQueue: string[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: DistrictLoaderCallbacks): void {
    this.callbacks = callbacks;
  }

  setMaxConcurrentLoads(max: number): void {
    this.maxConcurrentLoads = max;
  }

  // ─── Load Operations ───────────────────────────────────────────────────

  /**
   * Load a district's assets asynchronously.
   * If already loaded, resolves immediately.
   * If already loading, waits for existing load to complete.
   */
  async loadDistrict(config: DistrictConfig): Promise<LoadedDistrictScene | null> {
    const districtId = config.id;

    // Already loaded
    const existing = this.loadedScenes.get(districtId);
    if (existing) return existing;

    // Already loading — wait
    const status = this.loadStates.get(districtId);
    if (status?.state === 'loading') {
      return this.waitForLoad(districtId);
    }

    // Check concurrent load limit
    if (this.activeLoads >= this.maxConcurrentLoads) {
      this.loadQueue.push(districtId);
      return this.waitForLoad(districtId);
    }

    return this.executeLoad(config);
  }

  /**
   * Preload a district's assets in the background.
   * Lower priority than active loads — will queue if limit reached.
   */
  preloadDistrict(config: DistrictConfig): void {
    const districtId = config.id;
    if (this.isLoaded(districtId) || this.isLoading(districtId)) return;

    // Queue for background loading
    if (!this.loadQueue.includes(districtId)) {
      this.loadQueue.push(districtId);
    }
    this.processQueue(config);
  }

  /**
   * Unload a district's assets to free memory.
   * Removes all meshes from the scene and disposes geometry/materials.
   */
  unloadDistrict(districtId: string): void {
    const loaded = this.loadedScenes.get(districtId);
    if (!loaded) return;

    this.updateState(districtId, 'unloading', 0);

    // Remove root group from scene
    this.scene.remove(loaded.rootGroup);

    // Dispose all geometries and materials
    loaded.rootGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });

    // Dispose textures on meshes
    loaded.meshes.forEach((mesh) => {
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const mat of mats) {
            const m = mat as THREE.MeshStandardMaterial;
            if (m.map) m.map.dispose();
            if (m.normalMap) m.normalMap.dispose();
            if (m.roughnessMap) m.roughnessMap.dispose();
            if (m.metalnessMap) m.metalnessMap.dispose();
            if (m.emissiveMap) m.emissiveMap.dispose();
          }
        }
      });
    });

    loaded.meshes.clear();
    this.loadedScenes.delete(districtId);
    this.updateState(districtId, 'unloaded', 0);
    this.callbacks.onUnloaded?.(districtId);

    console.log(`[DistrictLoader] Unloaded: ${districtId}`);
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  isLoaded(districtId: string): boolean {
    return this.loadedScenes.has(districtId);
  }

  isLoading(districtId: string): boolean {
    return this.loadStates.get(districtId)?.state === 'loading';
  }

  getLoadState(districtId: string): DistrictLoadStatus | null {
    return this.loadStates.get(districtId) ?? null;
  }

  getLoadedScene(districtId: string): LoadedDistrictScene | null {
    return this.loadedScenes.get(districtId) ?? null;
  }

  getLoadedDistricts(): string[] {
    return Array.from(this.loadedScenes.keys());
  }

  getMemoryEstimate(): { totalMeshes: number; totalGeometries: number } {
    let totalMeshes = 0;
    let totalGeometries = 0;
    for (const loaded of this.loadedScenes.values()) {
      loaded.rootGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          totalMeshes++;
          totalGeometries++;
        }
      });
    }
    return { totalMeshes, totalGeometries };
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Unload all districts and clear state */
  dispose(): void {
    for (const districtId of this.loadedScenes.keys()) {
      this.unloadDistrict(districtId);
    }
    this.loadStates.clear();
    this.loadQueue = [];
    this.activeLoads = 0;
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private async executeLoad(config: DistrictConfig): Promise<LoadedDistrictScene | null> {
    const districtId = config.id;
    this.activeLoads++;
    this.updateState(districtId, 'loading', 0);
    this.callbacks.onLoadStarted?.(districtId);

    try {
      const loadedScene = await this.loadDistrictAssets(config);
      this.loadedScenes.set(districtId, loadedScene);
      this.updateState(districtId, 'loaded', 1, null, loadedScene.meshes.size);
      this.callbacks.onLoadComplete?.(districtId, loadedScene);
      console.log(`[DistrictLoader] Loaded: ${districtId} (${loadedScene.meshes.size} assets)`);
      return loadedScene;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown load error';
      this.updateState(districtId, 'error', 0, errorMsg);
      this.callbacks.onLoadError?.(districtId, errorMsg);
      console.warn(`[DistrictLoader] Failed to load ${districtId}: ${errorMsg}`);
      return null;
    } finally {
      this.activeLoads--;
      this.processNextInQueue();
    }
  }

  private async loadDistrictAssets(config: DistrictConfig): Promise<LoadedDistrictScene> {
    const rootGroup = new THREE.Group();
    rootGroup.name = `district_${config.id}`;
    rootGroup.userData = { districtId: config.id, isDistrict: true };

    const meshes = new Map<string, THREE.Object3D>();
    const assets = config.assets ?? [];
    const totalAssets = assets.length;

    // Load each asset
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      if (!asset.enabled) continue;

      try {
        const mesh = await this.loadAsset(asset);
        if (mesh) {
          meshes.set(asset.id, mesh);
          rootGroup.add(mesh);
        }
      } catch (err) {
        // Individual asset failure does not block district load
        console.warn(`[DistrictLoader] Asset failed: ${asset.id} — ${err instanceof Error ? err.message : 'error'}`);
      }

      // Report progress
      const progress = (i + 1) / Math.max(totalAssets, 1);
      this.updateState(config.id, 'loading', progress);
      this.callbacks.onLoadProgress?.(config.id, progress);
    }

    // If no explicit assets, create placeholder geometry for the district
    if (assets.length === 0) {
      const placeholder = this.createDistrictPlaceholder(config);
      rootGroup.add(placeholder);
      meshes.set(`${config.id}_placeholder`, placeholder);
    }

    // Create district ground plane
    const ground = this.createDistrictGround(config);
    rootGroup.add(ground);

    // Create return portal
    if (config.returnPortalPosition) {
      const returnPortal = this.createReturnPortal(config);
      rootGroup.add(returnPortal);
    }

    // Add to scene
    this.scene.add(rootGroup);

    return {
      districtId: config.id,
      rootGroup,
      meshes,
      config,
      loadedAt: Date.now(),
    };
  }

  private async loadAsset(asset: AssetEntry): Promise<THREE.Object3D | null> {
    // If file path is provided and valid, attempt GLB load
    if (asset.file && asset.file.endsWith('.glb')) {
      return this.loadGLB(asset);
    }

    // Fallback: create placeholder mesh
    return this.createAssetPlaceholder(asset);
  }

  private async loadGLB(asset: AssetEntry): Promise<THREE.Object3D> {
    // Dynamic import of GLTFLoader to avoid bundling if not needed
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js') as any;
    const loader = new GLTFLoader();

    return new Promise((resolve, _reject) => {
      loader.load(
        asset.file,
        (gltf: any) => {
          const model = gltf.scene;
          model.name = asset.id;
          model.position.set(...asset.position);
          model.rotation.set(...asset.rotation);
          model.scale.set(...asset.scale);
          model.userData = { assetId: asset.id, type: asset.type };
          model.castShadow = true;
          model.receiveShadow = true;
          model.traverse((child: any) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          resolve(model);
        },
        undefined,
        (_error: any) => {
          // Fallback to placeholder on load failure
          console.warn(`[DistrictLoader] GLB load failed for ${asset.id}, using placeholder`);
          resolve(this.createAssetPlaceholder(asset));
        }
      );
    });
  }

  private createAssetPlaceholder(asset: AssetEntry): THREE.Object3D {
    const group = new THREE.Group();
    group.name = asset.id;
    group.position.set(...asset.position);
    group.rotation.set(...asset.rotation);
    group.scale.set(...asset.scale);

    // Create a simple colored box as placeholder
    const colors: Record<string, number> = {
      architecture: 0x8b7355,
      landscaping: 0x4a7c3f,
      recreation: 0xff8c00,
      furniture: 0x654321,
      water: 0x4488cc,
      lighting: 0xffdd44,
      signage: 0xdddddd,
      portals: 0x7c4dff,
      props: 0xaaaaaa,
    };
    const color = colors[asset.type] ?? 0x888888;
    const size = asset.type === 'architecture' ? 4 : 1.5;

    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      transparent: true,
      opacity: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = size / 2;
    group.add(mesh);

    // Label sprite
    const label = this.createLabel(asset.id.replace(/_/g, ' '));
    label.position.y = size + 1;
    group.add(label);

    group.userData = { assetId: asset.id, type: asset.type, isPlaceholder: true };
    return group;
  }

  private createDistrictPlaceholder(config: DistrictConfig): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `${config.id}_placeholder`;

    // Center marker
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 3, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x7c4dff, emissive: 0x3322aa, emissiveIntensity: 0.3 });
    const marker = new THREE.Mesh(geo, mat);
    marker.position.y = 1.5;
    group.add(marker);

    // Name label
    const label = this.createLabel(config.name);
    label.position.y = 4;
    label.scale.set(6, 1.5, 1);
    group.add(label);

    return group;
  }

  private createDistrictGround(config: DistrictConfig): THREE.Mesh {
    const groundGeo = new THREE.PlaneGeometry(80, 80, 10, 10);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,
      roughness: 0.9,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = `${config.id}_ground`;
    return ground;
  }

  private createReturnPortal(config: DistrictConfig): THREE.Object3D {
    const pos = config.returnPortalPosition!;
    const group = new THREE.Group();
    group.name = `${config.id}_return_portal`;
    group.position.set(pos[0], pos[1], pos[2]);
    group.userData = { isReturnPortal: true, districtId: config.id };

    // Arch
    const archGeo = new THREE.TorusGeometry(2.5, 0.4, 8, 16, Math.PI);
    const archMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.6, emissive: 0x2244aa, emissiveIntensity: 0.2 });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.y = 2.5;
    group.add(arch);

    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.5, 5, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.6 });
    const left = new THREE.Mesh(pillarGeo, pillarMat);
    left.position.set(-2.5, 2.5, 0);
    group.add(left);
    const right = new THREE.Mesh(pillarGeo, pillarMat);
    right.position.set(2.5, 2.5, 0);
    group.add(right);

    // Portal surface
    const surfaceGeo = new THREE.CircleGeometry(2.2, 32);
    const surfaceMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
    surface.position.y = 2.8;
    group.add(surface);

    // Label
    const label = this.createLabel('Return to Main Union');
    label.position.y = 5.5;
    label.scale.set(5, 1.25, 1);
    group.add(label);

    return group;
  }

  private createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 128;

    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 1, 1);
    return sprite;
  }

  private updateState(
    districtId: string,
    state: DistrictLoadState,
    progress: number,
    error: string | null = null,
    assetCount: number = 0
  ): void {
    const existing = this.loadStates.get(districtId);
    this.loadStates.set(districtId, {
      districtId,
      state,
      progress,
      error,
      loadedAt: state === 'loaded' ? Date.now() : existing?.loadedAt ?? null,
      assetCount: assetCount || existing?.assetCount || 0,
      loadedAssets: state === 'loaded' ? assetCount : Math.floor(progress * (existing?.assetCount || 0)),
    });
  }

  private async waitForLoad(districtId: string): Promise<LoadedDistrictScene | null> {
    // Poll until loaded or error (timeout at 30s)
    const timeout = 30000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const state = this.loadStates.get(districtId);
      if (state?.state === 'loaded') return this.loadedScenes.get(districtId) ?? null;
      if (state?.state === 'error') return null;
      await new Promise(r => setTimeout(r, 100));
    }
    return null;
  }

  private processNextInQueue(): void {
    if (this.loadQueue.length === 0) return;
    if (this.activeLoads >= this.maxConcurrentLoads) return;
    // Queue items need their config to load — dequeue and let caller re-request
    this.loadQueue.shift();
  }

  private processQueue(config: DistrictConfig): void {
    if (this.activeLoads < this.maxConcurrentLoads) {
      const idx = this.loadQueue.indexOf(config.id);
      if (idx >= 0) {
        this.loadQueue.splice(idx, 1);
        this.executeLoad(config);
      }
    }
  }
}
