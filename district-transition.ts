/**
 * OCC Live - District Transition System (Part 8)
 * Handles seamless movement between districts while preserving:
 * - Avatar appearance and clothing variation
 * - Anonymous session identity
 * - Consent preferences (locked at entry)
 * - Movement state continuity
 *
 * Design:
 * - Triggers on portal entry (via DistrictRegistry)
 * - Shows loading overlay during transition
 * - Loads target district assets via DistrictLoader
 * - Applies district lighting preset
 * - Registers district zones, NPCs, interactions, and audio
 * - Teleports player to district spawn point
 * - Provides reliable return navigation to Main Union
 * - Unloads previous district when player leaves
 * - No personal information collected during transitions
 */

import * as THREE from 'three';
import type {
  DistrictConfig,
  DistrictLightingPreset,
  Vec3,
} from '../types/index.ts';
import { DistrictLoader } from './district-loader.ts';
import type { LoadedDistrictScene } from './district-loader.ts';

// ─── Transition State ────────────────────────────────────────────────────────

export type TransitionState =
  | 'idle'
  | 'fading_out'
  | 'loading'
  | 'fading_in'
  | 'complete';

export interface TransitionProgress {
  state: TransitionState;
  districtId: string | null;
  progress: number;
  message: string;
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface DistrictTransitionCallbacks {
  /** Called when transition begins (show loading screen) */
  onTransitionStart?: (fromDistrict: string, toDistrict: string) => void;
  /** Called with progress updates during loading */
  onTransitionProgress?: (progress: TransitionProgress) => void;
  /** Called when transition completes (hide loading screen) */
  onTransitionComplete?: (districtId: string) => void;
  /** Called when transition fails */
  onTransitionError?: (districtId: string, error: string) => void;
  /** Called to teleport the player to a position */
  onTeleportPlayer?: (position: Vec3, rotation: Vec3) => void;
  /** Called to apply lighting preset */
  onApplyLighting?: (preset: DistrictLightingPreset) => void;
  /** Called to restore Main Union lighting */
  onRestoreLighting?: () => void;
  /** Called to register district systems (zones, NPCs, interactions, audio) */
  onDistrictActivated?: (config: DistrictConfig) => void;
  /** Called to deactivate district systems */
  onDistrictDeactivated?: (districtId: string) => void;
  /** Called to notify multiplayer of district change */
  onDistrictChanged?: (sessionId: string, districtId: string) => void;
}

// ─── District Transition Manager ─────────────────────────────────────────────

export class DistrictTransitionManager {
  private scene: THREE.Scene;
  private loader: DistrictLoader;
  private callbacks: DistrictTransitionCallbacks = {};

  private currentDistrict: string = 'main_union';
  private previousDistrict: string | null = null;
  private transitionState: TransitionState = 'idle';
  private isTransitioning: boolean = false;

  // Transition visual
  private fadeOverlay: HTMLElement | null = null;
  private loadingOverlay: HTMLElement | null = null;

  // Timing
  private fadeOutDuration: number = 400; // ms
  private fadeInDuration: number = 400; // ms

  // Main Union state (preserved for return)
  private mainUnionVisible: boolean = true;

  constructor(scene: THREE.Scene, loader: DistrictLoader) {
    this.scene = scene;
    this.loader = loader;
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: DistrictTransitionCallbacks): void {
    this.callbacks = callbacks;
  }

  setFadeDurations(fadeOut: number, fadeIn: number): void {
    this.fadeOutDuration = fadeOut;
    this.fadeInDuration = fadeIn;
  }

  // ─── Transitions ───────────────────────────────────────────────────────

  /**
   * Transition to a target district.
   * Handles the full lifecycle: fade out → load → apply → fade in.
   */
  async transitionTo(config: DistrictConfig, sessionId: string): Promise<boolean> {
    if (this.isTransitioning) return false;
    if (config.id === this.currentDistrict) return false;

    // Check availability
    if (!this.isDistrictAvailable(config)) {
      this.callbacks.onTransitionError?.(config.id, `${config.name} is not available right now.`);
      return false;
    }

    this.isTransitioning = true;
    this.previousDistrict = this.currentDistrict;
    const fromDistrict = this.currentDistrict;

    this.callbacks.onTransitionStart?.(fromDistrict, config.id);
    this.updateProgress('fading_out', config.id, 0, 'Preparing...');

    try {
      // Phase 1: Fade out
      await this.fadeOut();

      // Phase 2: Load district assets
      this.updateProgress('loading', config.id, 0.1, `Loading ${config.name}...`);

      // Set up progress tracking
      this.loader.setCallbacks({
        onLoadProgress: (_id, progress) => {
          this.updateProgress('loading', config.id, 0.1 + progress * 0.7, `Loading ${config.name}...`);
        },
      });

      const loadedScene = await this.loader.loadDistrict(config);
      if (!loadedScene) {
        throw new Error(`Failed to load ${config.name}`);
      }

      // Phase 3: Deactivate previous district
      this.updateProgress('loading', config.id, 0.85, 'Setting up...');
      await this.deactivateDistrict(fromDistrict);

      // Phase 4: Activate new district
      this.activateDistrict(config, loadedScene);

      // Phase 5: Teleport player
      this.teleportToDistrict(config);

      // Phase 6: Apply lighting
      if (config.lighting) {
        this.callbacks.onApplyLighting?.(config.lighting);
      }

      // Update current district
      this.currentDistrict = config.id;
      this.callbacks.onDistrictChanged?.(sessionId, config.id);

      // Phase 7: Fade in
      this.updateProgress('fading_in', config.id, 0.95, 'Almost ready...');
      await this.fadeIn();

      // Complete
      this.updateProgress('complete', config.id, 1, '');
      this.callbacks.onTransitionComplete?.(config.id);

      console.log(`[DistrictTransition] Transitioned: ${fromDistrict} → ${config.id}`);
      return true;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Transition failed';
      console.warn(`[DistrictTransition] Error: ${errorMsg}`);
      this.callbacks.onTransitionError?.(config.id, errorMsg);

      // Attempt recovery — stay in current district
      this.hideFadeOverlay();
      this.hideLoadingOverlay();
      return false;

    } finally {
      this.isTransitioning = false;
      this.transitionState = 'idle';
    }
  }

  /**
   * Return to Main Union from any district.
   * Always available — provides reliable route back.
   */
  async returnToMainUnion(sessionId: string): Promise<boolean> {
    if (this.isTransitioning) return false;
    if (this.currentDistrict === 'main_union') return false;

    this.isTransitioning = true;
    const fromDistrict = this.currentDistrict;

    this.callbacks.onTransitionStart?.(fromDistrict, 'main_union');
    this.updateProgress('fading_out', 'main_union', 0, 'Returning to Main Union...');

    try {
      // Fade out
      await this.fadeOut();

      // Deactivate current district
      this.updateProgress('loading', 'main_union', 0.3, 'Returning...');
      await this.deactivateDistrict(fromDistrict);

      // Unload district assets to free memory
      this.loader.unloadDistrict(fromDistrict);

      // Re-show Main Union
      this.updateProgress('loading', 'main_union', 0.6, 'Loading Main Union...');
      this.showMainUnion();

      // Restore Main Union lighting
      this.callbacks.onRestoreLighting?.();

      // Teleport to Main Union spawn
      this.callbacks.onTeleportPlayer?.([0, 0, 5], [0, 0, 0]);

      // Update state
      this.currentDistrict = 'main_union';
      this.previousDistrict = fromDistrict;
      this.callbacks.onDistrictChanged?.(sessionId, 'main_union');

      // Fade in
      this.updateProgress('fading_in', 'main_union', 0.9, '');
      await this.fadeIn();

      this.updateProgress('complete', 'main_union', 1, '');
      this.callbacks.onTransitionComplete?.('main_union');

      console.log(`[DistrictTransition] Returned to Main Union from ${fromDistrict}`);
      return true;

    } catch (err) {
      console.warn(`[DistrictTransition] Return failed: ${err instanceof Error ? err.message : 'error'}`);
      this.hideFadeOverlay();
      this.hideLoadingOverlay();
      return false;

    } finally {
      this.isTransitioning = false;
      this.transitionState = 'idle';
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  getCurrentDistrict(): string {
    return this.currentDistrict;
  }

  getPreviousDistrict(): string | null {
    return this.previousDistrict;
  }

  isInMainUnion(): boolean {
    return this.currentDistrict === 'main_union';
  }

  getTransitionState(): TransitionState {
    return this.transitionState;
  }

  isCurrentlyTransitioning(): boolean {
    return this.isTransitioning;
  }

  // ─── Private: District Activation ──────────────────────────────────────

  private activateDistrict(config: DistrictConfig, _loadedScene: LoadedDistrictScene): void {
    // Hide Main Union geometry (but keep it in memory for fast return)
    this.hideMainUnion();

    // Notify systems to register district-specific zones, NPCs, etc.
    this.callbacks.onDistrictActivated?.(config);
  }

  private async deactivateDistrict(districtId: string): Promise<void> {
    if (districtId === 'main_union') {
      // Main Union stays in memory, just hidden
      return;
    }

    this.callbacks.onDistrictDeactivated?.(districtId);
  }

  private teleportToDistrict(config: DistrictConfig): void {
    // Find spawn point position
    const spawnPoints = config.spawnPoints ?? [];
    const activeSpawn = spawnPoints.find(sp => sp.active) ?? spawnPoints[0];

    if (activeSpawn) {
      this.callbacks.onTeleportPlayer?.(activeSpawn.position, activeSpawn.rotation);
    } else {
      // Default spawn at origin
      this.callbacks.onTeleportPlayer?.([0, 0, 5], [0, 0, 0]);
    }
  }

  // ─── Private: Main Union Visibility ────────────────────────────────────

  private hideMainUnion(): void {
    if (!this.mainUnionVisible) return;
    this.mainUnionVisible = false;

    // Hide Main Union objects (anything without district tag or with main_union district)
    this.scene.traverse((child) => {
      if (child.userData?.districtId && child.userData.districtId !== 'main_union') return;
      if (child.userData?.isDistrict) return; // Don't hide loaded district groups
      if (child.name === 'ground' || child.name === 'plaza_ground') {
        child.visible = false;
      }
    });
  }

  private showMainUnion(): void {
    if (this.mainUnionVisible) return;
    this.mainUnionVisible = true;

    this.scene.traverse((child) => {
      if (child.name === 'ground' || child.name === 'plaza_ground') {
        child.visible = true;
      }
    });
  }

  // ─── Private: Availability Check ──────────────────────────────────────

  private isDistrictAvailable(config: DistrictConfig): boolean {
    if (config.enabled === false) return false;
    if (config.status !== 'OPEN') return false;

    if (config.availability) {
      const now = Date.now();
      if (config.availability.opensAt) {
        const opens = new Date(config.availability.opensAt).getTime();
        if (now < opens) return false;
      }
      if (config.availability.closesAt) {
        const closes = new Date(config.availability.closesAt).getTime();
        if (now > closes) return false;
      }
    }

    return true;
  }

  // ─── Private: Visual Transitions ───────────────────────────────────────

  private fadeOut(): Promise<void> {
    return new Promise((resolve) => {
      this.showFadeOverlay();
      const overlay = this.fadeOverlay!;
      overlay.style.opacity = '0';
      overlay.style.transition = `opacity ${this.fadeOutDuration}ms ease-in`;

      // Force reflow
      void overlay.offsetHeight;
      overlay.style.opacity = '1';

      setTimeout(() => {
        this.showLoadingOverlay();
        resolve();
      }, this.fadeOutDuration);
    });
  }

  private fadeIn(): Promise<void> {
    return new Promise((resolve) => {
      this.hideLoadingOverlay();
      const overlay = this.fadeOverlay!;
      overlay.style.transition = `opacity ${this.fadeInDuration}ms ease-out`;
      overlay.style.opacity = '0';

      setTimeout(() => {
        this.hideFadeOverlay();
        resolve();
      }, this.fadeInDuration);
    });
  }

  private showFadeOverlay(): void {
    if (this.fadeOverlay) return;
    const el = document.createElement('div');
    el.id = 'district-fade-overlay';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 9000;
      background: #000000; opacity: 0;
      pointer-events: all;
    `;
    document.body.appendChild(el);
    this.fadeOverlay = el;
  }

  private hideFadeOverlay(): void {
    if (this.fadeOverlay) {
      this.fadeOverlay.remove();
      this.fadeOverlay = null;
    }
  }

  private showLoadingOverlay(): void {
    if (this.loadingOverlay) return;
    const el = document.createElement('div');
    el.id = 'district-loading-overlay';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 9001;
      background: #0a0a1a;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #ffffff;
    `;
    el.innerHTML = `
      <div style="font-size: 24px; font-weight: 700; margin-bottom: 16px;" id="dist-load-title">Loading...</div>
      <div style="width: 240px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
        <div id="dist-load-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #7c4dff, #536dfe); border-radius: 2px; transition: width 0.3s ease;"></div>
      </div>
      <div style="font-size: 13px; opacity: 0.6; margin-top: 12px;" id="dist-load-msg"></div>
    `;
    document.body.appendChild(el);
    this.loadingOverlay = el;
  }

  private hideLoadingOverlay(): void {
    if (this.loadingOverlay) {
      this.loadingOverlay.remove();
      this.loadingOverlay = null;
    }
  }

  private updateProgress(state: TransitionState, districtId: string | null, progress: number, message: string): void {
    this.transitionState = state;

    // Update loading overlay UI
    if (this.loadingOverlay) {
      const bar = this.loadingOverlay.querySelector('#dist-load-bar') as HTMLElement | null;
      const msg = this.loadingOverlay.querySelector('#dist-load-msg') as HTMLElement | null;
      if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
      if (msg) msg.textContent = message;
    }

    this.callbacks.onTransitionProgress?.({ state, districtId, progress, message });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  dispose(): void {
    this.hideFadeOverlay();
    this.hideLoadingOverlay();
    this.loader.dispose();
  }
}
