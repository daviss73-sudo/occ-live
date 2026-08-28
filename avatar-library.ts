/**
 * OCC Live - Avatar Library (Part 5)
 * Core registry for the production avatar library. Manages loading,
 * caching, querying, and lifecycle of complete avatar GLB models.
 *
 * Architecture:
 * - Supports 100+ avatars (no hard cap)
 * - Lazy-loads GLBs on demand (not all at once)
 * - Caches loaded models for clone reuse
 * - New avatars added via catalog only — no core changes needed
 * - Integrates with Avatar Variation System and Temporary Outfit System
 *
 * Players see only thumbnails and pick a character.
 * No personal info, no customization, no identity display.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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

  /**
   * Add a new avatar to the library at runtime.
   * Supports expansion without modifying core systems.
   */
  addAvatar(entry: AvatarModelEntry): void {
    this.catalog.set(entry.id, entry);
    this.loadStates.set(entry.id, 'unloaded');
    this.callbacks.onCatalogUpdated?.(this.catalog.size);
  }

  /**
   * Remove an avatar from the library (disable it).
   * Does not unload cached meshes (they may be in use).
   */
  removeAvatar(id: string): boolean {
    if (!this.catalog.has(id)) return false;
    this.catalog.delete(id);
    this.loadStates.delete(id);
    this.callbacks.onCatalogUpdated?.(this.catalog.size);
    return true;
  }

  // ─── Querying ──────────────────────────────────────────────────────────

  /** Get an avatar entry by ID */
  getEntry(id: string): AvatarModelEntry | undefined {
    return this.catalog.get(id);
  }

  /** Get all registered avatar entries */
  getAllEntries(): AvatarModelEntry[] {
    return Array.from(this.catalog.values());
  }

  /** Get the total number of registered avatars */
  getCount(): number {
    return this.catalog.size;
  }

  /** Get all available avatar IDs */
  getAvailableIds(): string[] {
    return Array.from(this.catalog.keys());
  }

  /** Filter entries by mobility type */
  getByMobility(mobility: 'walking' | 'wheelchair'): AvatarModelEntry[] {
    return this.getAllEntries().filter(e => e.mobility === mobility);
  }

  /** Filter entries by tag */
  getByTag(tag: string): AvatarModelEntry[] {
    return this.getAllEntries().filter(e => e.tags.includes(tag));
  }

  /** Check if an avatar ID exists in the library */
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

  /**
   * Preload an avatar into cache without returning it.
   * Useful for background loading (e.g. loading nearby players' avatars).
   */
  async preload(id: string): Promise<boolean> {
    const result = await this.loadAvatar(id);
    return result.state === 'loaded';
  }

  /**
   * Preload multiple avatars in parallel.
   * Useful for preloading popular or nearby avatars.
   */
  async preloadBatch(ids: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const promises = ids.map(async (id) => {
      const success = await this.preload(id);
      results.set(id, success);
    });
    await Promise.allSettled(promises);
    return results;
  }

  /** Get the load state of an avatar */
  getLoadState(id: string): AvatarLoadState {
    return this.loadStates.get(id) ?? 'unloaded';
  }

  /** Check if an avatar is loaded and cached */
  isLoaded(id: string): boolean {
    return this.cache.has(id);
  }

  // ─── Cache Management ──────────────────────────────────────────────────

  /** Get a fresh clone of a cached avatar (for spawning additional instances) */
  getClone(id: string): THREE.Group | null {
    const cached = this.cache.get(id);
    if (!cached) return null;
    return this.cloneAvatar(cached, id);
  }

  /** Evict a specific avatar from cache (frees memory) */
  evict(id: string): void {
    this.cache.delete(id);
    this.loadStates.set(id, 'unloaded');
  }

  /** Evict all avatars from cache */
  evictAll(): void {
    this.cache.clear();
    for (const id of this.catalog.keys()) {
      this.loadStates.set(id, 'unloaded');
    }
  }

  /** Get the number of currently cached avatars */
  getCacheSize(): number {
    return this.cache.size;
  }

  /** Get IDs of all cached avatars */
  getCachedIds(): string[] {
    return Array.from(this.cache.keys());
  }

  // ─── Animation Compatibility ───────────────────────────────────────────

  /**
   * Test if a loaded avatar mesh has a compatible animation rig.
   * Returns info about the mesh structure for debugging.
   */
  getAvatarMeshInfo(id: string): { hasSkeleton: boolean; boneCount: number; meshCount: number } | null {
    const cached = this.cache.get(id);
    if (!cached) return null;

    let hasSkeleton = false;
    let boneCount = 0;
    let meshCount = 0;

    cached.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        hasSkeleton = true;
        const skinned = child as THREE.SkinnedMesh;
        if (skinned.skeleton) {
          boneCount = Math.max(boneCount, skinned.skeleton.bones.length);
        }
      }
      if ((child as THREE.Mesh).isMesh) {
        meshCount++;
      }
    });

    return { hasSkeleton, boneCount, meshCount };
  }

  /**
   * Check animation compatibility for a loaded avatar.
   * Logs warnings for potential issues but never prevents the avatar
   * from being used (graceful degradation per spec Section 13).
   */
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

    // Always compatible per spec — never block an avatar from entering the world
    return { compatible: true, warnings };
  }

  // ─── Private ───────────────────────────────────────────────────────────

  /** Actually load a GLB file and cache the result */
  private async doLoad(entry: AvatarModelEntry): Promise<THREE.Group | null> {
    try {
      const gltf = await this.loader.loadAsync(entry.file);
      const scene = gltf.scene as THREE.Group;

      // Tag the loaded mesh with metadata
      scene.name = `avatar_model_${entry.id}`;
      scene.userData = {
        isProductionAvatar: true,
        avatarId: entry.id,
        mobility: entry.mobility,
        tags: entry.tags,
      };

            // Enable shadows and correct materials for proper lighting
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of mats) {
            const std = mat as THREE.MeshStandardMaterial;
            // Ensure the base color texture is read as sRGB (fixes dark/dull color)
            if (std.map) {
              std.map.colorSpace = THREE.SRGBColorSpace;
            }
            // Lower metalness so skin/clothing isn't near-black without reflections
            if (typeof std.metalness === 'number') {
              std.metalness = Math.min(std.metalness, 0.1);
            }
            // Slight emissive lift so faces read even in shadow
            if (std.emissive) {
              std.emissive = new THREE.Color(0x222222);
              std.emissiveIntensity = 1.0;
            }
            std.needsUpdate = true;
          }
        }
      });


      // Cache the original (clones are derived from this)
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

  /** Clone a cached avatar mesh with proper deep copy of materials */
  private cloneAvatar(source: THREE.Group, id: string): THREE.Group {
    const clone = source.clone(true);
    clone.name = `avatar_instance_${id}_${Date.now()}`;

    // Deep-clone materials so AVS color changes don't affect the cache original
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => m.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }
      }
    });

    clone.userData = {
      ...source.userData,
      isClone: true,
      clonedAt: Date.now(),
    };

    return clone;
  }
}
