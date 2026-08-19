/**
 * OCC Live - Avatar Variation System (AVS) (Part 5)
 * Automatically applies curated clothing color variations when multiple
 * players select the same base avatar. Students don't see customization
 * controls — AVS operates transparently.
 *
 * Rules:
 * - Only varies clothing colors (top, bottom, shoes)
 * - Never alters skin tone, hair, facial features, body type
 * - Uses a curated OCC Live color palette (no random generation)
 * - Variations are session-scoped (discarded on disconnect)
 * - Deterministic: all clients see the same variation for the same player
 * - Variation priority: top → bottom → shoes
 * - Synchronizes across multiplayer clients
 *
 * Part 5 additions:
 * - applyVariationToMesh() for production GLB avatars
 * - Multiplayer sync state export/import
 * - Bulk state reconciliation
 * - Integration with Temporary Outfit System (preserve/restore)
 */

import * as THREE from 'three';
import type { AVSConfig, AVSVariation, AVSColorPalette } from '../types/pipeline.ts';

/** Default curated OCC Live color palette */
const DEFAULT_PALETTE: AVSColorPalette[] = [
  { id: 'blue', hex: 0x4488cc },
  { id: 'orange', hex: 0xe87830 },
  { id: 'green', hex: 0x3d9e55 },
  { id: 'red', hex: 0xcc4444 },
  { id: 'purple', hex: 0x7c4dff },
  { id: 'yellow', hex: 0xe6b422 },
  { id: 'black', hex: 0x2a2a2a },
  { id: 'white', hex: 0xf0f0f0 },
  { id: 'gray', hex: 0x808080 },
  { id: 'teal', hex: 0x2aa198 },
  { id: 'burgundy', hex: 0x800020 },
  { id: 'olive', hex: 0x6b8e23 },
  { id: 'coral', hex: 0xff6b6b },
  { id: 'navy', hex: 0x1a237e },
  { id: 'forest', hex: 0x2e7d32 },
  { id: 'plum', hex: 0x9c27b0 },
];

// ─── Multiplayer Sync Types ──────────────────────────────────────────────────

/** Serializable variation state for network sync */
export interface AVSSyncState {
  sessionId: string;
  avatarId: string;
  variationIndex: number;   // Position among duplicates (determines colors)
  topColor: number;
  bottomColor: number;
  shoesColor: number;
}

// ─── Material Detection Heuristics ───────────────────────────────────────────

/**
 * Clothing material detection for production GLB avatars.
 * Uses mesh naming conventions and material properties to identify
 * which parts are clothing vs skin/hair.
 */
const CLOTHING_TOP_KEYWORDS = [
  'shirt', 'top', 'tshirt', 'hoodie', 'jacket', 'sweater',
  'vest', 'blouse', 'coat', 'torso', 'upper_body', 'chest',
];

const CLOTHING_BOTTOM_KEYWORDS = [
  'pants', 'bottom', 'shorts', 'jeans', 'skirt', 'trousers',
  'lower_body', 'legs', 'leg',
];

const CLOTHING_SHOES_KEYWORDS = [
  'shoe', 'shoes', 'boot', 'boots', 'sneaker', 'foot', 'feet',
  'sandal', 'slipper',
];

const SKIN_KEYWORDS = [
  'skin', 'face', 'head', 'hand', 'arm', 'neck', 'body_skin',
];

const HAIR_KEYWORDS = [
  'hair', 'braid', 'ponytail', 'bangs',
];

const DO_NOT_VARY = [...SKIN_KEYWORDS, ...HAIR_KEYWORDS, 'eye', 'mouth', 'teeth', 'tongue'];

export class AvatarVariationSystem {
  private config: AVSConfig;
  private variations: Map<string, AVSVariation> = new Map(); // sessionId → variation
  private avatarUsage: Map<string, string[]> = new Map();    // avatarId → [sessionIds]
  private originalMaterials: Map<string, Map<string, number>> = new Map(); // sessionId → materialId → originalColor

  constructor(config?: Partial<AVSConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      palette: config?.palette ?? DEFAULT_PALETTE,
      variationPriority: config?.variationPriority ?? ['top', 'bottom', 'shoes'],
    };
  }

  /**
   * Register a player and determine if a variation is needed.
   * Call when a player joins with their selected avatar.
   * Returns the variation (or null if no duplicate exists).
   */
  registerPlayer(sessionId: string, avatarId: string): AVSVariation | null {
    if (!this.config.enabled) return null;

    // Track avatar usage
    if (!this.avatarUsage.has(avatarId)) {
      this.avatarUsage.set(avatarId, []);
    }
    const users = this.avatarUsage.get(avatarId)!;

    // If this player is already registered, return existing variation
    if (users.includes(sessionId)) {
      return this.variations.get(sessionId) ?? null;
    }

    users.push(sessionId);

    // First user of this avatar gets no variation (original appearance)
    if (users.length === 1) {
      return null;
    }

    // Generate a deterministic variation for this player
    const variation = this.generateVariation(sessionId, avatarId, users.length - 1);
    this.variations.set(sessionId, variation);
    return variation;
  }

  /**
   * Remove a player (on disconnect/leave).
   * Does NOT reassign existing players' variations.
   */
  removePlayer(sessionId: string): void {
    const variation = this.variations.get(sessionId);
    if (variation) {
      const users = this.avatarUsage.get(variation.avatarId);
      if (users) {
        const idx = users.indexOf(sessionId);
        if (idx !== -1) users.splice(idx, 1);
        if (users.length === 0) this.avatarUsage.delete(variation.avatarId);
      }
      this.variations.delete(sessionId);
    } else {
      // Player might be the first (no variation) — check all avatar lists
      for (const [avatarId, users] of this.avatarUsage) {
        const idx = users.indexOf(sessionId);
        if (idx !== -1) {
          users.splice(idx, 1);
          if (users.length === 0) this.avatarUsage.delete(avatarId);
          break;
        }
      }
    }

    // Clean up stored original materials
    this.originalMaterials.delete(sessionId);
  }

  /** Get the variation for a player (null = use original appearance) */
  getVariation(sessionId: string): AVSVariation | null {
    return this.variations.get(sessionId) ?? null;
  }

  /** Get the color values for a player's variation */
  getColors(sessionId: string): { top: number | null; bottom: number | null; shoes: number | null } {
    const variation = this.variations.get(sessionId);
    if (!variation) return { top: null, bottom: null, shoes: null };
    return {
      top: variation.topColor,
      bottom: variation.bottomColor,
      shoes: variation.shoesColor,
    };
  }

  /** Check if a player has a variation applied */
  hasVariation(sessionId: string): boolean {
    return this.variations.has(sessionId);
  }

  /** Get how many players are using a specific avatar */
  getAvatarUserCount(avatarId: string): number {
    return this.avatarUsage.get(avatarId)?.length ?? 0;
  }

  /** Get the full palette */
  getPalette(): AVSColorPalette[] {
    return this.config.palette;
  }

  /** Clear all variations (e.g. session reset) */
  clear(): void {
    this.variations.clear();
    this.avatarUsage.clear();
    this.originalMaterials.clear();
  }

  // ─── Mesh Color Application (Part 5) ──────────────────────────────────

  /**
   * Apply a variation's colors to a production avatar GLB mesh.
   * Identifies clothing materials by mesh/material naming conventions
   * and applies the variation colors. Stores originals for restoration.
   *
   * Only modifies clothing. Never touches skin, face, eyes, mouth,
   * body type, or hair materials.
   */
  applyVariationToMesh(sessionId: string, avatarMesh: THREE.Group): boolean {
    const variation = this.variations.get(sessionId);
    if (!variation) return false;

    const originals = new Map<string, number>();
    this.originalMaterials.set(sessionId, originals);

    avatarMesh.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const meshName = (mesh.name || '').toLowerCase();

      // Skip skin, hair, and other protected elements
      if (DO_NOT_VARY.some(keyword => meshName.includes(keyword))) return;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      for (const mat of materials) {
        if (!mat || !(mat as THREE.MeshStandardMaterial).color) continue;
        const stdMat = mat as THREE.MeshStandardMaterial;
        const matName = (stdMat.name || '').toLowerCase();

        // Skip protected materials
        if (DO_NOT_VARY.some(keyword => matName.includes(keyword))) continue;

        const materialId = `${mesh.uuid}_${stdMat.uuid}`;
        const originalColor = stdMat.color.getHex();

        // Determine which clothing slot this material belongs to
        const isTop = CLOTHING_TOP_KEYWORDS.some(k => meshName.includes(k) || matName.includes(k));
        const isBottom = CLOTHING_BOTTOM_KEYWORDS.some(k => meshName.includes(k) || matName.includes(k));
        const isShoes = CLOTHING_SHOES_KEYWORDS.some(k => meshName.includes(k) || matName.includes(k));

        if (isTop) {
          originals.set(materialId, originalColor);
          stdMat.color.setHex(variation.topColor);
          stdMat.needsUpdate = true;
        } else if (isBottom) {
          originals.set(materialId, originalColor);
          stdMat.color.setHex(variation.bottomColor);
          stdMat.needsUpdate = true;
        } else if (isShoes) {
          originals.set(materialId, originalColor);
          stdMat.color.setHex(variation.shoesColor);
          stdMat.needsUpdate = true;
        }
      }
    });

    // If no clothing was detected by naming, use a heuristic approach:
    // Apply variation to the largest non-skin meshes (likely clothing)
    if (originals.size === 0) {
      this.applyVariationByHeuristic(sessionId, avatarMesh, variation, originals);
    }

    return originals.size > 0;
  }

  /**
   * Restore original colors on a mesh (e.g. after removing a variation
   * or when the player's avatar needs to be shown in its original state).
   */
  restoreOriginalColors(sessionId: string, avatarMesh: THREE.Group): void {
    const originals = this.originalMaterials.get(sessionId);
    if (!originals || originals.size === 0) return;

    avatarMesh.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      for (const mat of materials) {
        if (!mat || !(mat as THREE.MeshStandardMaterial).color) continue;
        const stdMat = mat as THREE.MeshStandardMaterial;
        const materialId = `${mesh.uuid}_${stdMat.uuid}`;

        const originalColor = originals.get(materialId);
        if (originalColor !== undefined) {
          stdMat.color.setHex(originalColor);
          stdMat.needsUpdate = true;
        }
      }
    });

    this.originalMaterials.delete(sessionId);
  }

  // ─── Multiplayer Synchronization (Part 5) ──────────────────────────────

  /**
   * Export the current variation state for multiplayer sync.
   * Send this to remote clients so they can apply the same variations.
   */
  exportSyncState(): AVSSyncState[] {
    const states: AVSSyncState[] = [];

    for (const [sessionId, variation] of this.variations) {
      const users = this.avatarUsage.get(variation.avatarId);
      const index = users ? users.indexOf(sessionId) : 0;

      states.push({
        sessionId,
        avatarId: variation.avatarId,
        variationIndex: Math.max(index, 1), // At least 1 (0 = no variation)
        topColor: variation.topColor,
        bottomColor: variation.bottomColor,
        shoesColor: variation.shoesColor,
      });
    }

    return states;
  }

  /**
   * Import variation state from a remote source (server or another client).
   * Used during initial world state sync to ensure all clients see the
   * same variations.
   */
  importSyncState(states: AVSSyncState[]): void {
    for (const state of states) {
      // Register the avatar usage
      if (!this.avatarUsage.has(state.avatarId)) {
        this.avatarUsage.set(state.avatarId, []);
      }
      const users = this.avatarUsage.get(state.avatarId)!;
      if (!users.includes(state.sessionId)) {
        users.push(state.sessionId);
      }

      // Apply the variation directly (from authoritative source)
      if (state.variationIndex > 0) {
        this.variations.set(state.sessionId, {
          sessionId: state.sessionId,
          avatarId: state.avatarId,
          topColor: state.topColor,
          bottomColor: state.bottomColor,
          shoesColor: state.shoesColor,
        });
      }
    }
  }

  /**
   * Get the sync state for a single player (for sending with join messages).
   */
  getPlayerSyncState(sessionId: string): AVSSyncState | null {
    const variation = this.variations.get(sessionId);
    if (!variation) return null;

    const users = this.avatarUsage.get(variation.avatarId);
    const index = users ? users.indexOf(sessionId) : 0;

    return {
      sessionId,
      avatarId: variation.avatarId,
      variationIndex: Math.max(index, 1),
      topColor: variation.topColor,
      bottomColor: variation.bottomColor,
      shoesColor: variation.shoesColor,
    };
  }

  // ─── Developer Tools (Part 5) ──────────────────────────────────────────

  /** Force a specific variation on a player (dev mode only) */
  forceVariation(sessionId: string, avatarId: string, topColor: number, bottomColor: number, shoesColor: number): void {
    this.variations.set(sessionId, {
      sessionId,
      avatarId,
      topColor,
      bottomColor,
      shoesColor,
    });
  }

  /** Reset all variation assignments (dev mode only) */
  resetAll(): void {
    this.variations.clear();
    this.avatarUsage.clear();
    this.originalMaterials.clear();
  }

  /** Get debug info about current state */
  getDebugInfo(): { totalVariations: number; avatarUsage: Record<string, number>; paletteSize: number } {
    const usage: Record<string, number> = {};
    for (const [avatarId, users] of this.avatarUsage) {
      usage[avatarId] = users.length;
    }
    return {
      totalVariations: this.variations.size,
      avatarUsage: usage,
      paletteSize: this.config.palette.length,
    };
  }

  // ─── Private ───────────────────────────────────────────────────────────

  /**
   * Generate a deterministic variation based on the player's position
   * among duplicate avatar users. Uses palette cycling to ensure
   * each duplicate gets a distinct combination.
   */
  private generateVariation(sessionId: string, avatarId: string, duplicateIndex: number): AVSVariation {
    const palette = this.config.palette;
    const paletteSize = palette.length;

    // Use different offsets for each clothing slot to maximize distinction
    const topIdx = duplicateIndex % paletteSize;
    const bottomIdx = (duplicateIndex + Math.floor(paletteSize / 3)) % paletteSize;
    const shoesIdx = (duplicateIndex + Math.floor(2 * paletteSize / 3)) % paletteSize;

    return {
      sessionId,
      avatarId,
      topColor: palette[topIdx].hex,
      bottomColor: palette[bottomIdx].hex,
      shoesColor: palette[shoesIdx].hex,
    };
  }

  /**
   * Heuristic-based color application for avatars without standard naming.
   * Identifies the largest colored meshes and applies variation colors
   * based on vertical position (top → top clothing, bottom → bottom clothing).
   */
  private applyVariationByHeuristic(
    sessionId: string,
    avatarMesh: THREE.Group,
    variation: AVSVariation,
    originals: Map<string, number>
  ): void {
    // Collect all meshes with their bounding box centers (for vertical sorting)
    const candidates: Array<{
      mesh: THREE.Mesh;
      material: THREE.MeshStandardMaterial;
      centerY: number;
      volume: number;
      materialId: string;
    }> = [];

    avatarMesh.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const meshName = (mesh.name || '').toLowerCase();

      // Skip skin/hair/face
      if (DO_NOT_VARY.some(k => meshName.includes(k))) return;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        if (!mat || !(mat as THREE.MeshStandardMaterial).color) continue;
        const stdMat = mat as THREE.MeshStandardMaterial;
        const matName = (stdMat.name || '').toLowerCase();
        if (DO_NOT_VARY.some(k => matName.includes(k))) return;

        // Compute bounding box for vertical positioning
        if (!mesh.geometry.boundingBox) {
          mesh.geometry.computeBoundingBox();
        }
        const bbox = mesh.geometry.boundingBox;
        if (!bbox) return;

        const centerY = (bbox.min.y + bbox.max.y) / 2;
        const volume = (bbox.max.x - bbox.min.x) * (bbox.max.y - bbox.min.y) * (bbox.max.z - bbox.min.z);

        candidates.push({
          mesh,
          material: stdMat,
          centerY,
          volume,
          materialId: `${mesh.uuid}_${stdMat.uuid}`,
        });
      }
    });

    if (candidates.length === 0) return;

    // Sort by volume (largest = most likely clothing)
    candidates.sort((a, b) => b.volume - a.volume);

    // Take top candidates (likely clothing)
    const topCandidates = candidates.filter(c => c.centerY > 0.5);
    const bottomCandidates = candidates.filter(c => c.centerY <= 0.5 && c.centerY > 0.1);
    const shoeCandidates = candidates.filter(c => c.centerY <= 0.1);

    // Apply to largest candidate in each region
    if (topCandidates.length > 0) {
      const c = topCandidates[0];
      originals.set(c.materialId, c.material.color.getHex());
      c.material.color.setHex(variation.topColor);
      c.material.needsUpdate = true;
    }

    if (bottomCandidates.length > 0) {
      const c = bottomCandidates[0];
      originals.set(c.materialId, c.material.color.getHex());
      c.material.color.setHex(variation.bottomColor);
      c.material.needsUpdate = true;
    }

    if (shoeCandidates.length > 0) {
      const c = shoeCandidates[0];
      originals.set(c.materialId, c.material.color.getHex());
      c.material.color.setHex(variation.shoesColor);
      c.material.needsUpdate = true;
    }
  }
}
