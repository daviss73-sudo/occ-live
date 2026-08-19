/**
 * OCC Live - Temporary Outfit System (Part 5)
 * Manages activity-specific outfits (e.g. wetsuit for Lazy River).
 *
 * Architecture:
 * - Preserves the player's exact original appearance (including AVS variation)
 * - Applies a standardized full-coverage outfit (long-sleeve + pants wetsuit)
 * - Restores the exact original appearance on activity exit
 * - Syncs outfit state across multiplayer clients
 * - Works with production GLB avatars (hides original, shows outfit mesh)
 *
 * The wetsuit is the OCC Live standardized full-coverage outfit:
 * long-sleeve top + full-length pants, one-piece design.
 *
 * Preservation includes:
 * - All clothing meshes/materials
 * - AVS clothing-color variation state
 * - Shoes and applicable accessories
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { TemporaryOutfitConfig } from '../types/pipeline.ts';

// ─── Stored Appearance State ─────────────────────────────────────────────────

interface StoredAppearance {
  sessionId: string;
  avatarId: string;
  /** Hidden mesh references and their original visibility */
  hiddenMeshes: Array<{ mesh: THREE.Object3D; wasVisible: boolean }>;
  /** AVS variation colors (preserved for restoration) */
  avsTopColor: number | null;
  avsBottomColor: number | null;
  avsShoesColor: number | null;
  /** Whether the player had an AVS variation active */
  hadVariation: boolean;
}

// ─── Active Outfit State ─────────────────────────────────────────────────────

interface ActiveOutfit {
  sessionId: string;
  config: TemporaryOutfitConfig;
  outfitMesh: THREE.Object3D | null;
  avatarGroup: THREE.Group;
  stored: StoredAppearance;
  appliedAt: number;
}

// ─── Outfit Sync State (for multiplayer) ─────────────────────────────────────

export interface OutfitSyncState {
  sessionId: string;
  outfitId: string;
  isActive: boolean;
}

// ─── Temporary Outfit System ─────────────────────────────────────────────────

export class TemporaryOutfitSystem {
  private loader: GLTFLoader;
  private outfitCache: Map<string, THREE.Group> = new Map();
  private outfitConfigs: Map<string, TemporaryOutfitConfig> = new Map();
  private activeOutfits: Map<string, ActiveOutfit> = new Map();
  private onOutfitChange: ((state: OutfitSyncState) => void) | null = null;

  constructor() {
    this.loader = new GLTFLoader();
  }

  /** Register outfit configurations */
  registerOutfits(configs: TemporaryOutfitConfig[]): void {
    for (const config of configs) {
      this.outfitConfigs.set(config.id, config);
    }
  }

  /** Register a single outfit config */
  registerOutfit(config: TemporaryOutfitConfig): void {
    this.outfitConfigs.set(config.id, config);
  }

  /** Get an outfit config by ID */
  getOutfitConfig(id: string): TemporaryOutfitConfig | undefined {
    return this.outfitConfigs.get(id);
  }

  /** Set callback for outfit state changes (for multiplayer sync) */
  setOnOutfitChange(callback: (state: OutfitSyncState) => void): void {
    this.onOutfitChange = callback;
  }

  /**
   * Apply a temporary outfit to an avatar.
   * Preserves the player's exact original appearance including AVS state.
   *
   * For production GLB avatars:
   * - Identifies and hides clothing meshes on the avatar
   * - Loads and attaches the outfit GLB mesh
   * - Stores all state for perfect restoration
   *
   * @param outfitId - Registered outfit config ID (e.g. 'wetsuit')
   * @param avatarGroup - The player's avatar THREE.Group
   * @param sessionId - Player session ID
   * @param avatarId - The avatar catalog ID (e.g. 'avatar_017')
   * @param avsColors - Current AVS variation colors (to preserve)
   */
  async applyOutfit(
    outfitId: string,
    avatarGroup: THREE.Group,
    sessionId: string,
    avatarId: string,
    avsColors?: { top: number | null; bottom: number | null; shoes: number | null }
  ): Promise<boolean> {
    const config = this.outfitConfigs.get(outfitId);
    if (!config) {
      console.warn(`[TemporaryOutfit] Unknown outfit: ${outfitId}`);
      return false;
    }

    // Already wearing this outfit?
    if (this.activeOutfits.has(sessionId)) {
      return false;
    }

    // Store original appearance
    const stored = this.storeAppearance(avatarGroup, sessionId, avatarId, config, avsColors);

    // Hide clothing meshes on the avatar (for production GLBs)
    this.hideClothingMeshes(avatarGroup, config, stored);

    // Load and apply the outfit mesh
    let outfitMesh: THREE.Object3D | null = null;
    try {
      outfitMesh = await this.loadOutfitMesh(config);
    } catch (error) {
      console.warn(`[TemporaryOutfit] Failed to load outfit, using placeholder:`, error);
      outfitMesh = this.createPlaceholderWetsuit();
    }

    if (outfitMesh) {
      outfitMesh.name = `outfit_${outfitId}`;
      outfitMesh.userData = {
        isTemporaryOutfit: true,
        outfitId,
        sessionId,
      };
      avatarGroup.add(outfitMesh);
    }

    // Record active outfit
    this.activeOutfits.set(sessionId, {
      sessionId,
      config,
      outfitMesh,
      avatarGroup,
      stored,
      appliedAt: Date.now(),
    });

    // Notify multiplayer sync
    this.onOutfitChange?.({
      sessionId,
      outfitId,
      isActive: true,
    });

    return true;
  }

  /**
   * Remove the temporary outfit and restore the exact original appearance.
   * Restores all clothing, AVS variation colors, shoes, and accessories.
   */
  removeOutfit(sessionId: string): boolean {
    const active = this.activeOutfits.get(sessionId);
    if (!active) return false;

    // Remove outfit mesh from avatar
    if (active.outfitMesh) {
      active.avatarGroup.remove(active.outfitMesh);
      // Dispose geometry and materials
      active.outfitMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });
    }

    // Restore hidden meshes
    for (const { mesh, wasVisible } of active.stored.hiddenMeshes) {
      mesh.visible = wasVisible;
    }

    this.activeOutfits.delete(sessionId);

    // Notify multiplayer sync
    this.onOutfitChange?.({
      sessionId,
      outfitId: active.config.id,
      isActive: false,
    });

    return true;
  }

  /** Is a player currently wearing a temporary outfit? */
  isWearingOutfit(sessionId: string): boolean {
    return this.activeOutfits.has(sessionId);
  }

  /** Get the active outfit ID for a player */
  getActiveOutfitId(sessionId: string): string | null {
    return this.activeOutfits.get(sessionId)?.config.id ?? null;
  }

  /** Get stored AVS colors for a player (for restoration after outfit removal) */
  getStoredAVSColors(sessionId: string): { top: number | null; bottom: number | null; shoes: number | null } | null {
    const active = this.activeOutfits.get(sessionId);
    if (!active) return null;
    return {
      top: active.stored.avsTopColor,
      bottom: active.stored.avsBottomColor,
      shoes: active.stored.avsShoesColor,
    };
  }

  /** Did the player have an AVS variation before the outfit was applied? */
  hadVariation(sessionId: string): boolean {
    return this.activeOutfits.get(sessionId)?.stored.hadVariation ?? false;
  }

  /** Get the avatar ID for a player wearing an outfit */
  getStoredAvatarId(sessionId: string): string | null {
    return this.activeOutfits.get(sessionId)?.stored.avatarId ?? null;
  }

  /** Remove all active outfits (e.g. on disconnect/cleanup) */
  removeAll(): void {
    for (const sessionId of Array.from(this.activeOutfits.keys())) {
      this.removeOutfit(sessionId);
    }
  }

  /** Get all active outfit sync states (for world state sync) */
  getActiveSyncStates(): OutfitSyncState[] {
    const states: OutfitSyncState[] = [];
    for (const [sessionId, active] of this.activeOutfits) {
      states.push({
        sessionId,
        outfitId: active.config.id,
        isActive: true,
      });
    }
    return states;
  }

  /** Clear outfit cache (frees memory) */
  clearCache(): void {
    this.outfitCache.clear();
  }

  // ─── Private: Appearance Preservation ──────────────────────────────────

  private storeAppearance(
    avatarGroup: THREE.Group,
    sessionId: string,
    avatarId: string,
    _config: TemporaryOutfitConfig,
    avsColors?: { top: number | null; bottom: number | null; shoes: number | null }
  ): StoredAppearance {
    return {
      sessionId,
      avatarId,
      hiddenMeshes: [],
      avsTopColor: avsColors?.top ?? null,
      avsBottomColor: avsColors?.bottom ?? null,
      avsShoesColor: avsColors?.shoes ?? null,
      hadVariation: (avsColors?.top != null || avsColors?.bottom != null || avsColors?.shoes != null),
    };
  }

  /**
   * Hide clothing meshes on a production GLB avatar.
   * Identifies clothing by slot naming (slot_top, slot_bottom, slot_shoes)
   * or by mesh naming conventions for production models.
   */
  private hideClothingMeshes(
    avatarGroup: THREE.Group,
    config: TemporaryOutfitConfig,
    stored: StoredAppearance
  ): void {
    // Method 1: Hide by slot name (for placeholder/assembled avatars)
    for (const slotName of config.hideSlots) {
      const slot = avatarGroup.getObjectByName(`slot_${slotName}`);
      if (slot) {
        stored.hiddenMeshes.push({ mesh: slot, wasVisible: slot.visible });
        slot.visible = false;
      }
    }

    // Method 2: Hide by mesh naming conventions (for production GLBs)
    const clothingKeywords = [
      'shirt', 'top', 'tshirt', 'hoodie', 'jacket', 'sweater',
      'pants', 'bottom', 'shorts', 'jeans', 'skirt', 'trousers',
      'shoe', 'shoes', 'boot', 'boots', 'sneaker',
      'vest', 'blouse', 'coat',
    ];

    // Only hide based on keywords if the slot-based method didn't find anything
    if (stored.hiddenMeshes.length === 0) {
      avatarGroup.traverse((child) => {
        const name = (child.name || '').toLowerCase();
        const isClothing = clothingKeywords.some(k => name.includes(k));

        if (isClothing && child.visible) {
          stored.hiddenMeshes.push({ mesh: child, wasVisible: true });
          child.visible = false;
        }
      });
    }

    // Method 3: If still nothing found (GLB with generic naming),
    // hide all meshes except head/face/hair/skin-colored ones.
    // This is aggressive but ensures the wetsuit is visible.
    if (stored.hiddenMeshes.length === 0) {
      const preserveKeywords = ['head', 'face', 'hair', 'eye', 'mouth', 'skin', 'neck'];
      avatarGroup.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const name = (child.name || '').toLowerCase();
        const shouldPreserve = preserveKeywords.some(k => name.includes(k));

        if (!shouldPreserve && child.visible && child !== avatarGroup) {
          stored.hiddenMeshes.push({ mesh: child, wasVisible: true });
          child.visible = false;
        }
      });
    }
  }

  /** Load an outfit mesh from GLB (with caching) */
  private async loadOutfitMesh(config: TemporaryOutfitConfig): Promise<THREE.Object3D> {
    const cached = this.outfitCache.get(config.file);
    if (cached) {
      return this.cloneOutfit(cached);
    }

    const gltf = await this.loader.loadAsync(config.file);
    const original = gltf.scene as THREE.Group;

    // Enable shadows
    original.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.outfitCache.set(config.file, original);
    return this.cloneOutfit(original);
  }

  /** Clone an outfit mesh with material deep copy */
  private cloneOutfit(source: THREE.Group): THREE.Group {
    const clone = source.clone(true);

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

    return clone;
  }

  /**
   * Creates the standardized OCC Live placeholder wetsuit.
   * Full-coverage: long-sleeve top + full-length pants, one-piece.
   * Dark navy blue — the OCC Live wetsuit color.
   */
  private createPlaceholderWetsuit(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'occ_live_wetsuit_placeholder';

    const wetsuitColor = 0x1a237e; // Dark navy blue (OCC Live standard)
    const accentColor = 0x283593; // Slightly lighter for definition

    // Full-body suit (torso + combined coverage)
    const bodyGeo = new THREE.CapsuleGeometry(0.28, 0.9, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: wetsuitColor,
      roughness: 0.35,
      metalness: 0.05,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.85;
    body.name = 'wetsuit_torso';
    body.castShadow = true;
    group.add(body);

    // Long sleeves (full arm coverage)
    const sleeveGeo = new THREE.CapsuleGeometry(0.075, 0.5, 6, 12);
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: wetsuitColor,
      roughness: 0.35,
      metalness: 0.05,
    });

    const leftSleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    leftSleeve.position.set(-0.36, 1.0, 0);
    leftSleeve.rotation.z = 0.12;
    leftSleeve.name = 'wetsuit_sleeve_left';
    leftSleeve.castShadow = true;
    group.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    rightSleeve.position.set(0.36, 1.0, 0);
    rightSleeve.rotation.z = -0.12;
    rightSleeve.name = 'wetsuit_sleeve_right';
    rightSleeve.castShadow = true;
    group.add(rightSleeve);

    // Full-length pants (legs)
    const legGeo = new THREE.CapsuleGeometry(0.11, 0.5, 6, 12);
    const legMat = new THREE.MeshStandardMaterial({
      color: wetsuitColor,
      roughness: 0.35,
      metalness: 0.05,
    });

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.1, 0.32, 0);
    leftLeg.name = 'wetsuit_leg_left';
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.1, 0.32, 0);
    rightLeg.name = 'wetsuit_leg_right';
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Accent stripe (down the side for visual definition)
    const stripeGeo = new THREE.BoxGeometry(0.02, 1.4, 0.02);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.3,
    });

    const leftStripe = new THREE.Mesh(stripeGeo, stripeMat);
    leftStripe.position.set(-0.27, 0.7, 0);
    group.add(leftStripe);

    const rightStripe = new THREE.Mesh(stripeGeo, stripeMat);
    rightStripe.position.set(0.27, 0.7, 0);
    group.add(rightStripe);

    return group;
  }
}
