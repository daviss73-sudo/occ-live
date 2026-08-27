/**
 * OCC Live - Avatar Library (Part 5)
 * Core registry for the production avatar library. Manages loading,
 * caching, querying, and lifecycle of complete avatar models.
 *
 * Architecture:
 * - Supports 100+ avatars (no hard cap)
 * - Lazy-loads GLTFs on demand (not all at once)
 * - Caches loaded models for clone reuse
 * - Draco decompression for compressed Meshy models
 * - New avatars added via catalog only — no core changes needed
 * - Integrates with Avatar Variation System and Temporary Outfit System
 *
 * Players see only thumbnails and pick a character.
 * No personal info, no customization, no identity display.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import type { AvatarModelEntry } from '../types/pipeline.ts';

// ─── Loading State ───────────────────────────────────────────────────────────

export type AvatarLoadState = 'unloaded' | 'loading' | 'loaded' | 'error';

export interface AvatarLoadResult {
  avatarId: string;
  state: AvatarLoadState;
  mesh: THREE.Group | null;
  error?: string;
}

// ─── Library Events ──────────────────────────────────────────────────────────

export interface AvatarLibraryCallbacks {
  onAvatarLoaded?: (avatarId: string, mesh: THREE.Group) => void;
  onAvatarError?: (avatarId: string, error: string) => void;
  onCatalogUpdated?: (count: number) => void;
}

// ─── Avatar Library ──────────────────────────────────────────────────────────

export class AvatarLibrary {
  private loader: GLTFLoader;
  private catalog: Map<string, AvatarModelEntry> = new Map();
  private cache: Map<string, THREE.Group> = new Map();
  private loadStates: Map<string, AvatarLoadState> = new Map();
  private loadPromises: Map<string, Promise<THREE.Group | null>> = new Map();
  private callbacks: AvatarLibraryCallbacks;

  constructor(entries: AvatarModelEntry[], callbacks?: AvatarLibraryCallbacks) {
    this.loader = new GLTFLoader();

    // Set up Draco decoder for compressed GLTF models (Meshy exports use Draco)
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    dracoLoader.preload();
    this.loader.setDRACOLoader(dracoLoader);

    this.callbacks = callbacks ?? {};
    this.registerAll(entries);
  }

  // ─── Registration ──────────────────────────────────────────────────────

  /** Register all avatar entries from a catalog array */
  registerAll(entries: AvatarModelEntry[]): void {
    for (const entry of entries) {
      this.catalog.set(entry.id, entry);
      this.loadStates.set(entry.id, 'unloaded');
    }
    this.callbacks.onCatalogUpdated?.(this.catalog.size);
  }

  /** Add a new avatar to the library at runtime */
  addAvatar(entry: AvatarModelEntry): void {
    this.catalog.set(entry.id, entry);
    this.loadStates.set(entry.id, 'unloaded');
    this.callbacks.onCatalogUpdated?.(this.catalog.size);
  }

  /** Remove an avatar from the library */
  removeAvatar(id: string): boolean {
    if (!this.catalog.has(id)) return false;
    this.catalog.delete(id);
    this.loadStates.delete(id);
    this.callbacks.onCatalogUpdated?.(this.catalog.size);
    return true;
  }

  // ─── Querying ──────────────────────────────────────────────────────────

  getEntry(id: string): AvatarModelEntry | undefined {
    return this.catalog.get(id);
  }

  getAllEntries(): AvatarModelEntry[] {
    return Array.from(this.catalog.values());
  }

  getCount(): number {
    return this.catalog.size;
  }

  getAvailableIds(): string[] {
    return Array.from(this.catalog.keys());
  }

  getByMobility(mobility: 'walking' | 'wheelchair'): AvatarModelEntry[] {
    return this.getAllEntries().filter(e => e.mobility === mobility);
  }

  getByTag(tag: string): AvatarModelEntry[] {
    return this.getAllEntries().filter(e => e.tags.includes(tag));
  }

  has(id: string): boolean {
    return this.catalog.has(id);
  }

  // ─── Loading ───────────────────────────────────────────────────────────

  /**
   * Load an avatar model by ID. Returns a clone of the cached model.
   * If already loading, returns the existing promise.
   * If already cached, returns immediately.
   */
  async loadAvatar(id: string): Promise<AvatarLoadResult> {
    const entry = this.catalog.get(id);
    if (!entry) {
      return { avatarId: id, state: 'error', mesh: null, error: `Avatar not found: ${id}` };
    }

    // Already cached — return a clone
    const cached = this.cache.get(id);
    if (cached) {
      const clone = this.cloneAvatar(cached, id);
      return { avatarId: id, state: 'loaded', mesh: clone };
    }

    // Already loading — wait for existing promise
    const existing = this.loadPromises.get(id);
    if (existing) {
      const mesh = await existing;
      if (mesh) {
        const clone = this.cloneAvatar(mesh, id);
        return { avatarId: id, state: 'loaded', mesh: clone };
      }
      return { avatarId: id, state: 'error', mesh: null, error: 'Load failed' };
    }

    // Start new load
    this.loadStates.set(id, 'loading');
    const promise = this.doLoad(entry);
    this.loadPromises.set(id, promise);

    const mesh = await promise;
    this.loadPromises.delete(id);

    if (mesh) {
      const clone = this.cloneAvatar(mesh, id);
      return { avatarId: id, state: 'loaded', mesh: clone };
    }

    return { avatarId: id, state: 'error', mesh: null, error: `Failed to load ${entry.file}` };
  }

  /** Preload an avatar into cache without returning it */
  async preload(id: string): Promise<boolean> {
    const result = await this.loadAvatar(id);
    return result.state === 'loaded';
  }

  /** Preload multiple avatars in parallel */
  async preloadBatch(ids: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const promises = ids.map(async (id) => {
      const success = await this.preload(id);
      results.set(id, success);
    });
    await Promise.allSettled(promises);
    return results;
  }

  getLoadState(id: string): AvatarLoadState {
    return this.loadStates.get(id) ?? 'unloaded';
  }

  isLoaded(id: string): boolean {
    return this.cache.has(id);
  }

  // ─── Cache Management ──────────────────────────────────────────────────

  getClone(id: string): THREE.Group | null {
    const cached = this.cache.get(id);
    if (!cached) return null;
    return this.cloneAvatar(cached, id);
  }

  evict(id: string): void {
    this.cache.delete(id);
    this.loadStates.set(id, 'unloaded');
  }

  evictAll(): void {
    this.cache.clear();
    for (const id of this.catalog.keys()) {
      this.loadStates.set(id, 'unloaded');
    }
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCachedIds(): string[] {
    return Array.from(this.cache.keys());
  }

  // ─── Animation Compatibility ───────────────────────────────────────────

  getAvatarMeshInfo(id: string): { hasSkeleton: boolean; boneCount: number; meshCount: number } | null {
    const cached = this.cache.get(id);
    if (!cached) return null;

    let hasSkeleton = false;
    let boneCount = 0;
    let meshCount = 0;

    cached.traverse((child: any) => {
      if (child.isSkinnedMesh) {
        hasSkeleton = true;
        if (child.skeleton) {
          boneCount = Math.max(boneCount, child.skeleton.bones.length);
        }
      }
      if (child.isMesh) {
        meshCount++;
      }
    });

    return { hasSkeleton, boneCount, meshCount };
  }

  checkAnimationCompatibility(id: string): { compatible: boolean; warnings: string[] } {
    const info = this.getAvatarMeshInfo(id);
    if (!info) return { compatible: false, warnings: ['Avatar not loaded'] };

    const warnings: string[] = [];

    if (!info.hasSkeleton) {
      warnings.push(`Avatar ${id} has no skeleton — will use procedural animations`);
    }

    if (info.meshCount === 0) {
      warnings.push(`Avatar ${id} has no visible meshes`);
    }

    return { compatible: true, warnings };
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private async doLoad(entry: AvatarModelEntry): Promise<THREE.Group | null> {
    try {
      const gltf = await this.loader.loadAsync(entry.file);
      const scene = gltf.scene as THREE.Group;

      scene.name = `avatar_model_${entry.id}`;
      scene.userData = {
        isProductionAvatar: true,
        avatarId: entry.id,
        mobility: entry.mobility,
        tags: entry.tags,
      };

      scene.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.cache.set(entry.id, scene);
      this.loadStates.set(entry.id, 'loaded');
      this.callbacks.onAvatarLoaded?.(entry.id, scene);

      return scene;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[AvatarLibrary] Failed to load ${entry.id}: ${message}`);
      this.loadStates.set(entry.id, 'error');
      this.callbacks.onAvatarError?.(entry.id, message);
      return null;
    }
  }

  private cloneAvatar(source: THREE.Group, id: string): THREE.Group {
    const clone = source.clone(true);
    clone.name = `avatar_instance_${id}_${Date.now()}`;

    clone.traverse((child: any) => {
      if (child.isMesh) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m: any) => m.clone());
        } else if (child.material) {
          child.material = child.material.clone();
        }
      }
    });

    return clone;
  }
}
