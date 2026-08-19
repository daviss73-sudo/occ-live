/**
 * OCC Live - Content Pack Manager (Part 10)
 * Manages reusable content packs for seasonal themes, events, and content updates.
 * Separates routine content configuration from core gameplay code.
 *
 * Design:
 * - Content packs bundle decorations, music, lighting, NPCs, and activity overrides
 * - Packs can be reused by multiple events
 * - Packs have configurable activation/deactivation dates
 * - Never permanently alters base-world assets
 * - Layers over existing content without removing it
 * - Uses the Part 7 event architecture (not a second event engine)
 * - No identity collection in any content feature
 * - Developer preview mode for testing before release
 */

import * as THREE from 'three';
import type {
  ContentPackConfig,
  AssetEntry,
  NPCConfig,
  DistrictLightingPreset,
} from '../types/index.ts';

// ─── Content Pack State ──────────────────────────────────────────────────────

export type ContentPackState = 'inactive' | 'scheduled' | 'active' | 'expired' | 'preview';

export interface ContentPackInstance {
  config: ContentPackConfig;
  state: ContentPackState;
  /** Assets placed in the scene by this pack */
  placedAssets: THREE.Object3D[];
  /** Timestamp when activated */
  activatedAt: number | null;
  /** Whether in developer preview mode */
  isPreview: boolean;
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface ContentPackCallbacks {
  onPackActivated?: (packId: string) => void;
  onPackDeactivated?: (packId: string) => void;
  onMusicOverride?: (zoneId: string, playlist: string, volume: number) => void;
  onMusicRestore?: (zoneId: string) => void;
  onLightingOverride?: (zoneId: string, preset: DistrictLightingPreset) => void;
  onLightingRestore?: (zoneId: string) => void;
  onNPCsAdded?: (zoneId: string, npcs: NPCConfig[]) => void;
  onNPCsRemoved?: (zoneId: string) => void;
  onActivityOverride?: (areaId: string, enabled: boolean) => void;
  onActivityRestore?: (areaId: string) => void;
}

// ─── Content Pack Manager ────────────────────────────────────────────────────

export class ContentPackManager {
  private scene: THREE.Scene;
  private packs: Map<string, ContentPackInstance> = new Map();
  private callbacks: ContentPackCallbacks = {};
  private devPreviewMode: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: ContentPackCallbacks): void {
    this.callbacks = callbacks;
  }

  /** Enable developer preview mode (allows previewing scheduled content) */
  setDevPreviewMode(enabled: boolean): void {
    this.devPreviewMode = enabled;
  }

  isDevPreviewMode(): boolean {
    return this.devPreviewMode;
  }

  // ─── Registration ──────────────────────────────────────────────────────

  /** Register a content pack */
  registerPack(config: ContentPackConfig): void {
    if (this.packs.has(config.id)) return;

    const state = this.resolveState(config);
    this.packs.set(config.id, {
      config,
      state,
      placedAssets: [],
      activatedAt: null,
      isPreview: false,
    });
  }

  /** Register multiple content packs */
  registerAll(configs: ContentPackConfig[]): void {
    for (const config of configs) {
      this.registerPack(config);
    }
  }

  /** Unregister a content pack (removes if active) */
  unregisterPack(packId: string): void {
    this.deactivatePack(packId);
    this.packs.delete(packId);
  }

  // ─── Activation ────────────────────────────────────────────────────────

  /**
   * Activate a content pack. Applies all overlays.
   * Can be called manually or triggered by scheduler.
   */
  activatePack(packId: string): boolean {
    const instance = this.packs.get(packId);
    if (!instance) return false;
    if (instance.state === 'active') return true;
    if (!instance.config.enabled && !instance.isPreview) return false;

    // Apply decorations
    this.applyDecorations(instance);

    // Apply music overrides
    for (const music of instance.config.musicPresets) {
      this.callbacks.onMusicOverride?.(music.zoneId, music.playlist, music.volume);
    }

    // Apply lighting overrides
    for (const lighting of instance.config.lightingPresets) {
      this.callbacks.onLightingOverride?.(lighting.zoneId, lighting.preset);
    }

    // Apply NPC overrides
    for (const npcPreset of instance.config.npcPresets) {
      this.callbacks.onNPCsAdded?.(npcPreset.zoneId, npcPreset.npcs);
    }

    // Apply activity overrides
    for (const override of instance.config.activityOverrides) {
      this.callbacks.onActivityOverride?.(override.areaId, override.enabled);
    }

    instance.state = 'active';
    instance.activatedAt = Date.now();
    this.callbacks.onPackActivated?.(packId);

    console.log(`[ContentPack] Activated: ${instance.config.name} (${packId})`);
    return true;
  }

  /**
   * Deactivate a content pack. Removes all overlays, restoring base state.
   * Never permanently alters base-world assets.
   */
  deactivatePack(packId: string): boolean {
    const instance = this.packs.get(packId);
    if (!instance) return false;
    if (instance.state !== 'active' && instance.state !== 'preview') return false;

    // Remove decorations from scene
    this.removeDecorations(instance);

    // Restore music
    for (const music of instance.config.musicPresets) {
      this.callbacks.onMusicRestore?.(music.zoneId);
    }

    // Restore lighting
    for (const lighting of instance.config.lightingPresets) {
      this.callbacks.onLightingRestore?.(lighting.zoneId);
    }

    // Remove NPC overrides
    for (const npcPreset of instance.config.npcPresets) {
      this.callbacks.onNPCsRemoved?.(npcPreset.zoneId);
    }

    // Restore activities
    for (const override of instance.config.activityOverrides) {
      this.callbacks.onActivityRestore?.(override.areaId);
    }

    instance.state = instance.isPreview ? 'scheduled' : 'inactive';
    instance.isPreview = false;
    instance.activatedAt = null;
    this.callbacks.onPackDeactivated?.(packId);

    console.log(`[ContentPack] Deactivated: ${instance.config.name} (${packId})`);
    return true;
  }

  /**
   * Preview a content pack (developer mode).
   * Activates it regardless of schedule.
   */
  previewPack(packId: string): boolean {
    if (!this.devPreviewMode) {
      console.warn(`[ContentPack] Preview mode not enabled`);
      return false;
    }

    const instance = this.packs.get(packId);
    if (!instance) return false;

    instance.isPreview = true;
    instance.state = 'preview';
    return this.activatePack(packId);
  }

  /** End preview of a content pack */
  endPreview(packId: string): boolean {
    const instance = this.packs.get(packId);
    if (!instance || !instance.isPreview) return false;
    return this.deactivatePack(packId);
  }

  // ─── Scheduler Integration ─────────────────────────────────────────────

  /**
   * Check all packs for scheduled activation/deactivation.
   * Called periodically (e.g., every 30 seconds).
   */
  checkSchedules(): void {
    const now = Date.now();

    for (const [packId, instance] of this.packs) {
      if (instance.isPreview) continue; // Don't auto-manage previews

      const config = instance.config;
      if (!config.enabled) continue;

      const shouldBeActive = this.shouldBeActive(config, now);

      if (shouldBeActive && instance.state !== 'active') {
        this.activatePack(packId);
      } else if (!shouldBeActive && instance.state === 'active') {
        this.deactivatePack(packId);
      }
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get a content pack instance */
  getPack(packId: string): ContentPackInstance | null {
    return this.packs.get(packId) ?? null;
  }

  /** Get all active packs */
  getActivePacks(): ContentPackInstance[] {
    return Array.from(this.packs.values()).filter(p => p.state === 'active');
  }

  /** Get all scheduled (upcoming) packs */
  getScheduledPacks(): ContentPackInstance[] {
    return Array.from(this.packs.values()).filter(p => p.state === 'scheduled');
  }

  /** Get all packs */
  getAllPacks(): ContentPackInstance[] {
    return Array.from(this.packs.values());
  }

  /** Get packs targeting a specific location */
  getPacksForLocation(locationId: string): ContentPackInstance[] {
    return Array.from(this.packs.values())
      .filter(p => p.config.targetLocations.includes(locationId));
  }

  /** Is any pack currently active? */
  hasActivePacks(): boolean {
    return Array.from(this.packs.values()).some(p => p.state === 'active');
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Deactivate all packs and clean up */
  dispose(): void {
    for (const packId of this.packs.keys()) {
      this.deactivatePack(packId);
    }
    this.packs.clear();
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private resolveState(config: ContentPackConfig): ContentPackState {
    if (!config.enabled) return 'inactive';
    const now = Date.now();
    if (this.shouldBeActive(config, now)) return 'scheduled'; // Will activate on next check
    if (config.deactivatesAt && new Date(config.deactivatesAt).getTime() < now) return 'expired';
    if (config.activatesAt && new Date(config.activatesAt).getTime() > now) return 'scheduled';
    return 'inactive';
  }

  private shouldBeActive(config: ContentPackConfig, now: number): boolean {
    if (!config.enabled) return false;

    // No dates = always active when enabled
    if (!config.activatesAt && !config.deactivatesAt) return true;

    if (config.activatesAt) {
      const activates = new Date(config.activatesAt).getTime();
      if (now < activates) return false;
    }

    if (config.deactivatesAt) {
      const deactivates = new Date(config.deactivatesAt).getTime();
      if (now > deactivates) return false;
    }

    return true;
  }

  private applyDecorations(instance: ContentPackInstance): void {
    for (const asset of instance.config.decorations) {
      if (!asset.enabled) continue;

      const mesh = this.createDecorationPlaceholder(asset);
      instance.placedAssets.push(mesh);
      this.scene.add(mesh);
    }
  }

  private removeDecorations(instance: ContentPackInstance): void {
    for (const obj of instance.placedAssets) {
      this.scene.remove(obj);
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    }
    instance.placedAssets = [];
  }

  private createDecorationPlaceholder(asset: AssetEntry): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `contentpack_${asset.id}`;
    group.position.set(...asset.position);
    group.rotation.set(...asset.rotation);
    group.scale.set(...asset.scale);
    group.userData = { isContentPack: true, assetId: asset.id };

    // Placeholder geometry (will be replaced when GLB loads)
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.5;
    group.add(mesh);

    return group;
  }
}
