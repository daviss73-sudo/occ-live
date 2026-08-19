/**
 * OCC Live - Enhanced Asset Registry (Part 4)
 * Extends the base AssetRegistry with collision geometry generation,
 * interaction anchor management, LOD support, and the full Meshy
 * import pipeline. Preserves backward compatibility with Part 1 assets.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Vec3 } from '../types/index.ts';
import type {
  EnhancedAssetEntry,
  CollisionConfig,
  InteractionAnchor,
  LODConfig,
  LightingZoneConfig,
} from '../types/pipeline.ts';

interface PlacedAsset {
  entry: EnhancedAssetEntry;
  mesh: THREE.Object3D;
  collisionMesh: THREE.Object3D | null;
  anchorMeshes: Map<string, THREE.Object3D>;
  lightSource: THREE.Light | null;
}

export class EnhancedAssetRegistry {
  private loader: GLTFLoader;
  private cache: Map<string, THREE.Group> = new Map();
  private entries: Map<string, EnhancedAssetEntry> = new Map();
  private placed: Map<string, PlacedAsset> = new Map();
  private scene: THREE.Scene;
  private collisionGroup: THREE.Group;
  private debugVisible: boolean = false;

  constructor(scene: THREE.Scene) {
    this.loader = new GLTFLoader();
    this.scene = scene;
    this.collisionGroup = new THREE.Group();
    this.collisionGroup.name = '__collision_group__';
    this.collisionGroup.visible = false;
    this.scene.add(this.collisionGroup);
  }

  // ─── Registration ──────────────────────────────────────────────────────

  /** Register all enhanced asset entries */
  registerAll(assets: EnhancedAssetEntry[]): void {
    for (const asset of assets) {
      this.entries.set(asset.id, asset);
    }
  }

  /** Register a single entry */
  register(asset: EnhancedAssetEntry): void {
    this.entries.set(asset.id, asset);
  }

  /** Update an entry without affecting gameplay */
  update(id: string, partial: Partial<EnhancedAssetEntry>): void {
    const existing = this.entries.get(id);
    if (existing) {
      this.entries.set(id, { ...existing, ...partial });
    }
  }

  /** Get an entry by ID */
  getEntry(id: string): EnhancedAssetEntry | undefined {
    return this.entries.get(id);
  }

  // ─── Loading ───────────────────────────────────────────────────────────

  /** Load and place all enabled assets */
  async loadAll(): Promise<void> {
    const enabled = Array.from(this.entries.values()).filter(e => e.enabled);
    const promises = enabled.map(entry => this.loadAndPlace(entry));
    await Promise.allSettled(promises);
    console.log(`[EnhancedAssetRegistry] Loaded ${enabled.length} assets`);
  }

  /** Load a single asset by ID */
  async load(id: string): Promise<THREE.Object3D | null> {
    const entry = this.entries.get(id);
    if (!entry || !entry.enabled) return null;
    const placed = await this.loadAndPlace(entry);
    return placed?.mesh ?? null;
  }

  /** Place placeholders for all registered assets that aren't yet loaded */
  placeAllPlaceholders(): void {
    for (const entry of this.entries.values()) {
      if (!this.placed.has(entry.id)) {
        this.createPlaceholder(entry);
      }
    }
  }

  // ─── Asset Replacement (Meshy workflow) ────────────────────────────────

  /** Replace an asset's GLB file without changing gameplay logic */
  async replace(id: string, newFile: string): Promise<THREE.Object3D | null> {
    this.remove(id);
    this.cache.delete(newFile);
    this.update(id, { file: newFile, enabled: true });
    const placed = await this.loadAndPlace(this.entries.get(id)!);
    return placed?.mesh ?? null;
  }

  /** Remove a placed asset and its collision/anchors */
  remove(id: string): void {
    const placed = this.placed.get(id);
    if (!placed) return;

    this.scene.remove(placed.mesh);
    if (placed.collisionMesh) {
      this.collisionGroup.remove(placed.collisionMesh);
    }
    if (placed.lightSource) {
      this.scene.remove(placed.lightSource);
    }
    for (const anchor of placed.anchorMeshes.values()) {
      this.scene.remove(anchor);
    }
    this.placed.delete(id);
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get the placed Three.js object */
  getObject(id: string): THREE.Object3D | undefined {
    return this.placed.get(id)?.mesh;
  }

  /** Is an asset currently in the scene? */
  isPlaced(id: string): boolean {
    return this.placed.has(id);
  }

  /** Get interaction anchors for an asset */
  getAnchors(id: string): InteractionAnchor[] {
    return this.entries.get(id)?.interactionAnchors ?? [];
  }

  /** Find an available (unoccupied) anchor on an asset */
  findAvailableAnchor(assetId: string, type?: string): InteractionAnchor | null {
    const anchors = this.getAnchors(assetId);
    for (const anchor of anchors) {
      if (anchor.occupied) continue;
      if (type && anchor.type !== type) continue;
      return anchor;
    }
    return null;
  }

  /** Mark an anchor as occupied */
  occupyAnchor(assetId: string, anchorId: string, sessionId: string): boolean {
    const entry = this.entries.get(assetId);
    if (!entry) return false;
    const anchor = entry.interactionAnchors.find(a => a.id === anchorId);
    if (!anchor || anchor.occupied) return false;
    anchor.occupied = true;
    anchor.occupiedBy = sessionId;
    return true;
  }

  /** Release an anchor */
  releaseAnchor(assetId: string, anchorId: string): void {
    const entry = this.entries.get(assetId);
    if (!entry) return;
    const anchor = entry.interactionAnchors.find(a => a.id === anchorId);
    if (anchor) {
      anchor.occupied = false;
      anchor.occupiedBy = null;
    }
  }

  /** Get all collision meshes (for raycasting/physics) */
  getCollisionGroup(): THREE.Group {
    return this.collisionGroup;
  }

  // ─── Debug ─────────────────────────────────────────────────────────────

  /** Toggle collision/anchor debug visualization */
  setDebugVisible(visible: boolean): void {
    this.debugVisible = visible;
    this.collisionGroup.visible = visible;
    for (const placed of this.placed.values()) {
      for (const anchor of placed.anchorMeshes.values()) {
        anchor.visible = visible;
      }
    }
  }

  isDebugVisible(): boolean {
    return this.debugVisible;
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private async loadAndPlace(entry: EnhancedAssetEntry): Promise<PlacedAsset | null> {
    let model: THREE.Object3D;

    const cached = this.cache.get(entry.file);
    if (cached) {
      model = cached.clone();
    } else {
      try {
        const gltf = await this.loader.loadAsync(entry.file);
        this.cache.set(entry.file, gltf.scene.clone() as THREE.Group);
        model = gltf.scene;
      } catch (error) {
        console.warn(`[EnhancedAssetRegistry] Failed to load ${entry.file}`, error);
        this.createPlaceholder(entry);
        return null;
      }
    }

    // Apply transform
    this.applyTransform(model, entry.position, entry.rotation, entry.scale);
    model.name = entry.id;
    model.userData = {
      assetId: entry.id,
      zoneId: entry.zoneId,
      category: entry.category,
    };

    // Enable shadows on meshes
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).receiveShadow = true;
      }
    });

    // Remove existing placement
    this.remove(entry.id);

    this.scene.add(model);

    // Build collision
    const collisionMesh = this.buildCollision(entry);

    // Build anchor debug meshes
    const anchorMeshes = this.buildAnchorMeshes(entry);

    // Build lighting
    const lightSource = this.buildLighting(entry);

    const placed: PlacedAsset = {
      entry,
      mesh: model,
      collisionMesh,
      anchorMeshes,
      lightSource,
    };

    this.placed.set(entry.id, placed);
    return placed;
  }

  private createPlaceholder(entry: EnhancedAssetEntry): void {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    this.applyTransform(group, entry.position, entry.rotation, entry.scale);
    group.name = `placeholder_${entry.id}`;
    group.userData = { assetId: entry.id, isPlaceholder: true };

    this.scene.add(group);
    this.placed.set(entry.id, {
      entry,
      mesh: group,
      collisionMesh: null,
      anchorMeshes: new Map(),
      lightSource: null,
    });
  }

  private buildCollision(entry: EnhancedAssetEntry): THREE.Object3D | null {
    if (!entry.collision || entry.collision.type === 'none') return null;

    let geo: THREE.BufferGeometry;
    const size = entry.collision.size;

    switch (entry.collision.shape) {
      case 'box':
        geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
        break;
      case 'sphere':
        geo = new THREE.SphereGeometry(size[0] / 2, 8, 8);
        break;
      case 'capsule':
        geo = new THREE.CapsuleGeometry(size[0] / 2, size[1], 4, 8);
        break;
      default:
        geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    }

    const mat = new THREE.MeshBasicMaterial({
      color: entry.collision.type === 'solid' ? 0xff0000 : 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });

    const collisionMesh = new THREE.Mesh(geo, mat);
    const offset = entry.collision.offset;
    collisionMesh.position.set(
      entry.position[0] + offset[0],
      entry.position[1] + offset[1],
      entry.position[2] + offset[2]
    );
    collisionMesh.name = `collision_${entry.id}`;
    collisionMesh.userData = {
      assetId: entry.id,
      collisionType: entry.collision.type,
    };
    collisionMesh.visible = this.debugVisible;

    this.collisionGroup.add(collisionMesh);
    return collisionMesh;
  }

  private buildAnchorMeshes(entry: EnhancedAssetEntry): Map<string, THREE.Object3D> {
    const meshes = new Map<string, THREE.Object3D>();

    for (const anchor of entry.interactionAnchors) {
      const marker = new THREE.Group();

      // Small sphere for anchor point
      const geo = new THREE.SphereGeometry(0.15, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffdd44,
        transparent: true,
        opacity: 0.6,
      });
      const sphere = new THREE.Mesh(geo, mat);
      marker.add(sphere);

      marker.position.set(
        entry.position[0] + anchor.position[0],
        entry.position[1] + anchor.position[1],
        entry.position[2] + anchor.position[2]
      );
      marker.name = `anchor_${entry.id}_${anchor.id}`;
      marker.userData = { assetId: entry.id, anchorId: anchor.id, anchorType: anchor.type };
      marker.visible = this.debugVisible;

      this.scene.add(marker);
      meshes.set(anchor.id, marker);
    }

    return meshes;
  }

  private buildLighting(entry: EnhancedAssetEntry): THREE.Light | null {
    if (!entry.lighting) return null;

    const light = new THREE.PointLight(
      entry.lighting.color,
      entry.lighting.intensity,
      entry.lighting.radius
    );
    light.position.set(entry.position[0], entry.position[1] + 2, entry.position[2]);
    light.castShadow = entry.lighting.castShadow;
    light.name = `light_${entry.id}`;

    this.scene.add(light);
    return light;
  }

  private applyTransform(obj: THREE.Object3D, position: Vec3, rotation: Vec3, scale: Vec3): void {
    obj.position.set(position[0], position[1], position[2]);
    obj.rotation.set(rotation[0], rotation[1], rotation[2]);
    obj.scale.set(scale[0], scale[1], scale[2]);
  }
}
