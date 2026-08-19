/**
 * OCC Live - Photobooth Registry (Part 9)
 * Manages multiple photobooth instances across all districts.
 * Bridges the photobooth system with the shared activity framework.
 *
 * Design:
 * - Each registered photobooth gets its own session, UI, capture, and sync
 * - New photobooths are added via photobooth-config.ts (no core changes needed)
 * - Integrates with SharedActivitySystem for activity tracking
 * - All photobooth rules (queue, consent, invitation) apply universally
 * - District photobooths activate/deactivate with their parent district
 */

import type { PhotoboothConfig } from './photobooth-types.ts';
import { PhotoboothSession } from './photobooth-session.ts';
import { PhotoboothCapture } from './photobooth-capture.ts';
import { PhotoboothUI } from './photobooth-ui.ts';
import { PhotoboothSync } from './photobooth-sync.ts';
import { PhotoboothPoseLibrary } from './photobooth-poses.ts';
import { photoboothConfigs, getEnabledPhotobooths } from './photobooth-config.ts';

// ─── Photobooth Instance ─────────────────────────────────────────────────────

export interface PhotoboothInstance {
  config: PhotoboothConfig;
  session: PhotoboothSession;
  capture: PhotoboothCapture;
  ui: PhotoboothUI;
  sync: PhotoboothSync;
  districtId: string | null;
  isActive: boolean;
}

// ─── Registry Callbacks ──────────────────────────────────────────────────────

export interface PhotoboothRegistryCallbacks {
  onBoothActivated?: (boothId: string) => void;
  onBoothDeactivated?: (boothId: string) => void;
  onPlayerEnteredQueue?: (boothId: string, sessionId: string, position: number) => void;
  onSessionStarted?: (boothId: string) => void;
  onSessionCompleted?: (boothId: string) => void;
}

// ─── Photobooth Registry ─────────────────────────────────────────────────────

export class PhotoboothRegistry {
  private booths: Map<string, PhotoboothInstance> = new Map();
  private poseLibrary: PhotoboothPoseLibrary;
  private callbacks: PhotoboothRegistryCallbacks = {};

  constructor() {
    this.poseLibrary = new PhotoboothPoseLibrary();
  }

  // ─── Initialization ────────────────────────────────────────────────────

  /**
   * Initialize all registered photobooths from config.
   * Called during app startup.
   */
  initializeAll(): void {
    for (const config of photoboothConfigs) {
      this.registerBooth(config);
    }
  }

  /**
   * Register a single photobooth.
   * Can be called at runtime to add district photobooths on load.
   */
  registerBooth(config: PhotoboothConfig): PhotoboothInstance {
    if (this.booths.has(config.id)) {
      return this.booths.get(config.id)!;
    }

    const session = new PhotoboothSession(config);
    const capture = new PhotoboothCapture(config);
    const ui = new PhotoboothUI();
    const sync = new PhotoboothSync(session, config.id);

    // Determine district from zone ID
    const districtId = this.resolveDistrictFromZone(config.zoneId);

    const instance: PhotoboothInstance = {
      config,
      session,
      capture,
      ui,
      sync,
      districtId,
      isActive: config.enabled,
    };

    // Wire session callbacks
    session.setCallbacks({
      onQueueJoined: (sessionId, position) => {
        this.callbacks.onPlayerEnteredQueue?.(config.id, sessionId, position);
      },
      onSessionComplete: () => {
        this.callbacks.onSessionCompleted?.(config.id);
      },
    });

    this.booths.set(config.id, instance);
    return instance;
  }

  /**
   * Unregister a photobooth (when district is unloaded).
   */
  unregisterBooth(boothId: string): void {
    const instance = this.booths.get(boothId);
    if (!instance) return;

    instance.session.fullReset();
    instance.capture.dispose();
    instance.ui.dispose();
    this.booths.delete(boothId);
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: PhotoboothRegistryCallbacks): void {
    this.callbacks = callbacks;
  }

  // ─── Access ────────────────────────────────────────────────────────────

  /** Get a specific booth instance */
  getBooth(boothId: string): PhotoboothInstance | null {
    return this.booths.get(boothId) ?? null;
  }

  /** Get booth session */
  getSession(boothId: string): PhotoboothSession | null {
    return this.booths.get(boothId)?.session ?? null;
  }

  /** Get booth UI */
  getUI(boothId: string): PhotoboothUI | null {
    return this.booths.get(boothId)?.ui ?? null;
  }

  /** Get booth capture system */
  getCapture(boothId: string): PhotoboothCapture | null {
    return this.booths.get(boothId)?.capture ?? null;
  }

  /** Get shared pose library */
  getPoseLibrary(): PhotoboothPoseLibrary {
    return this.poseLibrary;
  }

  /** Get all registered booth IDs */
  getAllBoothIds(): string[] {
    return Array.from(this.booths.keys());
  }

  /** Get all active booths */
  getActiveBooths(): PhotoboothInstance[] {
    return Array.from(this.booths.values()).filter(b => b.isActive);
  }

  /** Get booths for a specific district */
  getBoothsForDistrict(districtId: string): PhotoboothInstance[] {
    return Array.from(this.booths.values()).filter(b => b.districtId === districtId);
  }

  /** Get the nearest booth to a position */
  getNearestBooth(position: [number, number, number]): PhotoboothInstance | null {
    let nearest: PhotoboothInstance | null = null;
    let nearestDist = Infinity;

    for (const instance of this.booths.values()) {
      if (!instance.isActive) continue;
      const bp = instance.config.position;
      const dx = position[0] - bp[0];
      const dz = position[2] - bp[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = instance;
      }
    }

    return nearest;
  }

  // ─── District Integration ──────────────────────────────────────────────

  /** Activate all booths for a district */
  activateDistrictBooths(districtId: string): void {
    for (const instance of this.booths.values()) {
      if (instance.districtId === districtId) {
        instance.isActive = true;
        this.callbacks.onBoothActivated?.(instance.config.id);
      }
    }
  }

  /** Deactivate all booths for a district (when district unloads) */
  deactivateDistrictBooths(districtId: string): void {
    for (const instance of this.booths.values()) {
      if (instance.districtId === districtId) {
        instance.isActive = false;
        instance.session.fullReset();
        this.callbacks.onBoothDeactivated?.(instance.config.id);
      }
    }
  }

  // ─── Player Interaction ────────────────────────────────────────────────

  /**
   * Handle a player pressing E near a photobooth.
   * Finds the correct booth and joins its queue.
   */
  handleInteraction(boothId: string, sessionId: string, hasPhotographyConsent: boolean): {
    success: boolean;
    position: number | null;
    message: string;
  } {
    const instance = this.booths.get(boothId);
    if (!instance || !instance.isActive) {
      return { success: false, position: null, message: 'Photobooth is not available.' };
    }

    if (!hasPhotographyConsent) {
      return { success: false, position: null, message: 'Photography consent required.' };
    }

    const position = instance.session.joinQueue(sessionId, hasPhotographyConsent);
    if (position === null) {
      return { success: false, position: null, message: 'Queue is full.' };
    }

    // Show queue UI
    const msg = instance.session.getQueue().getPositionMessage(sessionId);
    if (msg) {
      instance.ui.showQueuePosition(msg);
    }

    return { success: true, position, message: msg?.message ?? `You're #${position} in line.` };
  }

  // ─── Disconnect ────────────────────────────────────────────────────────

  /** Handle player disconnect across all booths */
  handleDisconnect(sessionId: string): void {
    for (const instance of this.booths.values()) {
      instance.session.handleDisconnect(sessionId);
    }
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Dispose all booths */
  dispose(): void {
    for (const instance of this.booths.values()) {
      instance.session.fullReset();
      instance.capture.dispose();
      instance.ui.dispose();
    }
    this.booths.clear();
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private resolveDistrictFromZone(zoneId: string): string | null {
    // Map zone IDs to districts
    if (zoneId === 'main_plaza') return 'main_union';
    if (zoneId.startsWith('skyline_')) return 'skyline';
    if (zoneId.startsWith('pulse_')) return 'pulse';
    if (zoneId.startsWith('arcade_')) return 'arcade';
    if (zoneId.startsWith('throwback_')) return 'throwback_80s_90s';
    if (zoneId.startsWith('mystique_')) return 'mystique';
    return null;
  }
}
