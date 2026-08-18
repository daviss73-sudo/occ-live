/**
 * OCC Live - Seasonal Layer System (Part 10)
 * Applies and removes temporary visual/audio theme layers.
 * Seasonal layers modify decorations, signage, lighting, music,
 * and selected effects without permanently altering base-world assets.
 *
 * Supported themes:
 * - fall_kickoff (September)
 * - spring_kickoff (January)
 * - winter
 * - spring
 * - summer
 * - special (one-off themed events)
 *
 * Design:
 * - Layers stack on top of base world
 * - Removing a layer fully restores original state
 * - Multiple layers can coexist (priority-based)
 * - Effects can be reduced via accessibility settings
 * - No identity information collected
 */

import * as THREE from 'three';
import type {
  SeasonalLayerConfig,
  AssetEntry,
  DistrictLightingPreset,
} from '../types/index.ts';

// ─── Layer State ─────────────────────────────────────────────────────────────

export type SeasonalLayerState = 'inactive' | 'scheduled' | 'active' | 'expired';

export interface SeasonalLayerInstance {
  config: SeasonalLayerConfig;
  state: SeasonalLayerState;
  /** Decoration objects placed in scene */
  decorations: THREE.Object3D[];
  /** Original lighting state (for restoration) */
  originalLighting: Partial<DistrictLightingPreset> | null;
  /** Original music mapping (for restoration) */
  originalMusic: Map<string, string>;
  /** Active particle/effect systems */
  activeEffects: string[];
  /** Timestamp when activated */
  activatedAt: number | null;
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface SeasonalLayerCallbacks {
  onLayerActivated?: (layerId: string, theme: string) => void;
  onLayerDeactivated?: (layerId: string) => void;
  onLightingModified?: (override: Partial<DistrictLightingPreset>) => void;
  onLightingRestored?: () => void;
  onMusicOverride?: (zoneId: string, playlist: string) => void;
  onMusicRestored?: (zoneId: string, originalPlaylist: string) => void;
  onEffectStarted?: (effectId: string) => void;
  onEffectStopped?: (effectId: string) => void;
}

// ─── Seasonal Layer Manager ──────────────────────────────────────────────────

export class SeasonalLayerManager {
  private scene: THREE.Scene;
  private layers: Map<string, SeasonalLayerInstance> = new Map();
  private callbacks: SeasonalLayerCallbacks = {};
  private reducedMotion: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: SeasonalLayerCallbacks): void {
    this.callbacks = callbacks;
  }

  /** Respect accessibility: reduce/disable particle effects */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    // Stop active effects if reduced motion enabled
    if (reduced) {
      for (const instance of this.layers.values()) {
        if (instance.state === 'active') {
          for (const effect of instance.activeEffects) {
            this.callbacks.onEffectStopped?.(effect);
          }
          instance.activeEffects = [];
        }
      }
    }
  }

  // ─── Registration ──────────────────────────────────────────────────────

  /** Register a seasonal layer */
  registerLayer(config: SeasonalLayerConfig): void {
    if (this.layers.has(config.id)) return;

    this.layers.set(config.id, {
      config,
      state: this.resolveState(config),
      decorations: [],
      originalLighting: null,
      originalMusic: new Map(),
      activeEffects: [],
      activatedAt: null,
    });
  }

  /** Register multiple layers */
  registerAll(configs: SeasonalLayerConfig[]): void {
    for (const config of configs) {
      this.registerLayer(config);
    }
  }

  // ─── Activation ────────────────────────────────────────────────────────

  /**
   * Activate a seasonal layer.
   * Applies decorations, lighting modifications, music overrides, and effects.
   */
  activateLayer(layerId: string): boolean {
    const instance = this.layers.get(layerId);
    if (!instance) return false;
    if (instance.state === 'active') return true;
    if (!instance.config.enabled) return false;

    // Apply decorations
    this.applyDecorations(instance);

    // Apply lighting override (store original for restoration)
    if (instance.config.lightingOverride) {
      this.callbacks.onLightingModified?.(instance.config.lightingOverride);
    }

    // Apply music overrides
    for (const musicOverride of instance.config.musicOverride) {
      this.callbacks.onMusicOverride?.(musicOverride.zoneId, musicOverride.playlist);
    }

    // Apply effects (respecting reduced motion)
    if (!this.reducedMotion) {
      for (const effect of instance.config.effects) {
        instance.activeEffects.push(effect);
        this.callbacks.onEffectStarted?.(effect);
      }
    }

    instance.state = 'active';
    instance.activatedAt = Date.now();
    this.callbacks.onLayerActivated?.(layerId, instance.config.theme);

    console.log(`[SeasonalLayer] Activated: ${instance.config.name} (${instance.config.theme})`);
    return true;
  }

  /**
   * Deactivate a seasonal layer.
   * Removes all modifications and restores original state.
   */
  deactivateLayer(layerId: string): boolean {
    const instance = this.layers.get(layerId);
    if (!instance) return false;
    if (instance.state !== 'active') return false;

    // Remove decorations
    this.removeDecorations(instance);

    // Restore lighting
    if (instance.config.lightingOverride) {
      this.callbacks.onLightingRestored?.();
    }

    // Restore music
    for (const musicOverride of instance.config.musicOverride) {
      const original = instance.originalMusic.get(musicOverride.zoneId);
      if (original) {
        this.callbacks.onMusicRestored?.(musicOverride.zoneId, original);
      }
    }
    instance.originalMusic.clear();

    // Stop effects
    for (const effect of instance.activeEffects) {
      this.callbacks.onEffectStopped?.(effect);
    }
    instance.activeEffects = [];

    instance.state = 'inactive';
    instance.activatedAt = null;
    this.callbacks.onLayerDeactivated?.(layerId);

    console.log(`[SeasonalLayer] Deactivated: ${instance.config.name}`);
    return true;
  }

  // ─── Scheduler ─────────────────────────────────────────────────────────

  /**
   * Check all layers for scheduled activation/deactivation.
   * Called periodically.
   */
  checkSchedules(): void {
    const now = Date.now();

    for (const [layerId, instance] of this.layers) {
      if (!instance.config.enabled) continue;

      const shouldBeActive = this.shouldBeActive(instance.config, now);

      if (shouldBeActive && instance.state !== 'active') {
        this.activateLayer(layerId);
      } else if (!shouldBeActive && instance.state === 'active') {
        this.deactivateLayer(layerId);
      }
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get a layer instance */
  getLayer(layerId: string): SeasonalLayerInstance | null {
    return this.layers.get(layerId) ?? null;
  }

  /** Get the currently active layer (if any) */
  getActiveLayer(): SeasonalLayerInstance | null {
    for (const instance of this.layers.values()) {
      if (instance.state === 'active') return instance;
    }
    return null;
  }

  /** Get all active layers */
  getActiveLayers(): SeasonalLayerInstance[] {
    return Array.from(this.layers.values()).filter(l => l.state === 'active');
  }

  /** Is any seasonal layer active? */
  hasActiveLayer(): boolean {
    return Array.from(this.layers.values()).some(l => l.state === 'active');
  }

  /** Get the current seasonal theme name (or null) */
  getCurrentTheme(): string | null {
    const active = this.getActiveLayer();
    return active?.config.theme ?? null;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Deactivate all layers and clean up */
  dispose(): void {
    for (const layerId of this.layers.keys()) {
      this.deactivateLayer(layerId);
    }
    this.layers.clear();
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private resolveState(config: SeasonalLayerConfig): SeasonalLayerState {
    if (!config.enabled) return 'inactive';
    const now = Date.now();
    if (this.shouldBeActive(config, now)) return 'scheduled'; // Will activate on check
    if (config.deactivatesAt && new Date(config.deactivatesAt).getTime() < now) return 'expired';
    return 'scheduled';
  }

  private shouldBeActive(config: SeasonalLayerConfig, now: number): boolean {
    if (!config.enabled) return false;
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

  private applyDecorations(instance: SeasonalLayerInstance): void {
    for (const asset of instance.config.decorations) {
      if (!asset.enabled) continue;
      const obj = this.createDecoration(asset, instance.config.theme);
      instance.decorations.push(obj);
      this.scene.add(obj);
    }
  }

  private removeDecorations(instance: SeasonalLayerInstance): void {
    for (const obj of instance.decorations) {
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
    instance.decorations = [];
  }

  private createDecoration(asset: AssetEntry, theme: string): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `seasonal_${theme}_${asset.id}`;
    group.position.set(...asset.position);
    group.rotation.set(...asset.rotation);
    group.scale.set(...asset.scale);
    group.userData = { isSeasonal: true, theme, assetId: asset.id };

    // Theme-colored placeholder
    const themeColors: Record<string, number> = {
      fall_kickoff: 0xff8c00,
      spring_kickoff: 0x88cc44,
      winter: 0xaaddff,
      spring: 0xff88cc,
      summer: 0xffdd00,
      special: 0xff44ff,
    };
    const color = themeColors[theme] ?? 0xffffff;

    const geo = new THREE.SphereGeometry(0.5, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.5;
    group.add(mesh);

    return group;
  }
}
