/**
 * OCC Live - Asset Registry
 * Manages loading, caching, and placement of .glb assets.
 * Assets are registered via configuration and loaded on demand.
 * Replacing a Meshy .glb file does not require changing gameplay code.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { AssetEntry, Vec3 } from '../types/index.ts';

export class AssetRegistry {
  private loader: GLTFLoader;
  private cache: Map<string, THREE.Group> = new Map();
  private entries: Map<string, AssetEntry> = new Map();
  private scene: THREE.Scene;
  private placed: Map<string, THREE.Object3D> = new Map();

  constructor(scene: THREE.Scene) {
    this.loader = new GLTFLoader();
    this.scene = scene;
  }

  /** Register all asset entries from config */
  registerAll(assets: AssetEntry[]): void {
    for (const asset of assets) {
      this.entries.set(asset.id, asset);
    }
  }

  /** Register a single asset entry */
  register(asset: AssetEntry): void {
    this.entries.set(asset.id, asset);
  }

  /** Update an asset entry (e.g. change position/file) without touching gameplay code */
  update(id: string, partial: Partial<AssetEntry>): void {
    const existing = this.entries.get(id);
    if (existing) {
      this.entries.set(id, { ...existing, ...partial });
    }
  }

  /** Get a registered asset entry by ID */
  getEntry(id: string): AssetEntry | undefined {
    return this.entries.get(id);
  }

  /** Load and place all enabled assets into the scene */
  async loadAll(): Promise<void> {
    const enabled = Array.from(this.entries.values()).filter(e => e.enabled);
    const promises = enabled.map(entry => this.loadAndPlace(entry));
    await Promise.allSettled(promises);
  }

  /** Load a single asset by ID (if enabled) */
  async load(id: string): Promise<THREE.Object3D | null> {
    const entry = this.entries.get(id);
    if (!entry || !entry.enabled) return null;
    return this.loadAndPlace(entry);
  }

  /** Remove a placed asset from the scene */
  remove(id: string): void {
    const obj = this.placed.get(id);
    if (obj) {
      this.scene.remove(obj);
      this.placed.delete(id);
    }
  }

  /** Replace an asset: remove old, update entry, load new */
  async replace(id: string, newFile: string): Promise<THREE.Object3D | null> {
    this.remove(id);
    this.cache.delete(newFile);
    this.update(id, { file: newFile, enabled: true });
    return this.load(id);
  }

  /** Check if an asset is currently placed in the scene */
  isPlaced(id: string): boolean {
    return this.placed.has(id);
  }

  /** Get the Three.js object for a placed asset */
  getObject(id: string): THREE.Object3D | undefined {
    return this.placed.get(id);
  }

  /** Create a placeholder mesh for assets that haven't been loaded yet */
  createPlaceholder(entry: AssetEntry, color: number = 0x888888): THREE.Object3D {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    this.applyTransform(group, entry.position, entry.rotation, entry.scale);
    group.name = `placeholder_${entry.id}`;
    group.userData = { assetId: entry.id, isPlaceholder: true };

    this.scene.add(group);
    this.placed.set(entry.id, group);
    return group;
  }

  /** Place placeholders for all registered (but disabled/missing) assets */
  placeAllPlaceholders(): void {
    for (const entry of this.entries.values()) {
      if (!this.placed.has(entry.id)) {
        this.createPlaceholder(entry);
      }
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private async loadAndPlace(entry: AssetEntry): Promise<THREE.Object3D> {
    let model = this.cache.get(entry.file);

    if (!model) {
      try {
        const gltf = await this.loader.loadAsync(entry.file);
        model = gltf.scene;
        this.cache.set(entry.file, model.clone() as THREE.Group);
      } catch (error) {
        console.warn(`[AssetRegistry] Failed to load ${entry.file}, using placeholder`, error);
        return this.createPlaceholder(entry, 0xff4444);
      }
    } else {
      model = model.clone();
    }

    this.applyTransform(model, entry.position, entry.rotation, entry.scale);
    model.name = entry.id;
    model.userData = { assetId: entry.id, zoneId: entry.zoneId };

    // Remove any existing placement
    this.remove(entry.id);

    this.scene.add(model);
    this.placed.set(entry.id, model);
    return model;
  }

  private applyTransform(obj: THREE.Object3D, position: Vec3, rotation: Vec3, scale: Vec3): void {
    obj.position.set(position[0], position[1], position[2]);
    obj.rotation.set(rotation[0], rotation[1], rotation[2]);
    obj.scale.set(scale[0], scale[1], scale[2]);
  }
}
