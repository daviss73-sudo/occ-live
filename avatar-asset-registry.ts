/**
 * OCC Live - Avatar Asset Registry (Part 2)
 * Manages loading and caching of avatar .glb assets per slot.
 * Allows replacing placeholder geometry with Meshy-created assets
 * without changing gameplay code. Just update the file path in the
 * asset manifest.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { AvatarAssetManifest, AvatarSlotAsset } from '../types/avatar.ts';

export class AvatarAssetRegistry {
  private loader: GLTFLoader;
  private cache: Map<string, THREE.Group> = new Map();
  private manifest: AvatarAssetManifest;

  constructor(manifest: AvatarAssetManifest) {
    this.loader = new GLTFLoader();
    this.manifest = manifest;
  }

  /** Get the asset manifest */
  getManifest(): AvatarAssetManifest {
    return this.manifest;
  }

  /** Find a slot asset definition by ID */
  findAsset(id: string): AvatarSlotAsset | undefined {
    const allSlots = [
      ...this.manifest.bodies,
      ...this.manifest.skins,
      ...this.manifest.eyes,
      ...this.manifest.mouths,
      ...this.manifest.hairs,
      ...this.manifest.tops,
      ...this.manifest.bottoms,
      ...this.manifest.shoes,
      ...this.manifest.accessories,
    ];
    return allSlots.find(a => a.id === id);
  }

  /** Load a .glb asset by its file path (returns cached if available) */
  async loadAsset(filePath: string): Promise<THREE.Group | null> {
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath)!.clone();
    }

    try {
      const gltf = await this.loader.loadAsync(filePath);
      this.cache.set(filePath, gltf.scene);
      return gltf.scene.clone();
    } catch (error) {
      console.warn(`[AvatarAssetRegistry] Failed to load: ${filePath}`, error);
      return null;
    }
  }

  /** Load an asset by slot ID (if it has a file defined) */
  async loadSlotAsset(id: string): Promise<THREE.Group | null> {
    const asset = this.findAsset(id);
    if (!asset || !asset.file) return null;
    return this.loadAsset(asset.file);
  }

  /** Check if a slot has a real asset (vs placeholder) */
  hasRealAsset(id: string): boolean {
    const asset = this.findAsset(id);
    return asset?.file !== null && asset?.file !== undefined;
  }

  /** Update an asset entry's file path (for hot-swapping) */
  updateAssetFile(id: string, newFile: string | null): void {
    const asset = this.findAsset(id);
    if (asset) {
      asset.file = newFile;
      // Clear cache for old file
      if (newFile) this.cache.delete(newFile);
    }
  }

  /** Clear asset cache */
  clearCache(): void {
    this.cache.clear();
  }

  /** Get all available options for a slot category */
  getOptionsForSlot(slot: string): AvatarSlotAsset[] {
    switch (slot) {
      case 'body': return this.manifest.bodies;
      case 'skin': return this.manifest.skins;
      case 'eyes': return this.manifest.eyes;
      case 'mouth': return this.manifest.mouths;
      case 'hair': return this.manifest.hairs;
      case 'top': return this.manifest.tops;
      case 'bottom': return this.manifest.bottoms;
      case 'shoes': return this.manifest.shoes;
      case 'accessories': return this.manifest.accessories;
      default: return [];
    }
  }
}
