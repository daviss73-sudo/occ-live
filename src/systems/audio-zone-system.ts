/**
 * OCC Live - Audio Zone System
 * Framework for spatial audio zones. Tracks player position and
 * determines which audio zone is active. Actual audio playback
 * will be connected when music files are available.
 */

import * as THREE from 'three';
import type { AudioZoneConfig } from '../types/index.ts';

export interface ActiveAudioZone {
  config: AudioZoneConfig;
  center: THREE.Vector3;
}

export class AudioZoneSystem {
  private zones: Map<string, ActiveAudioZone> = new Map();
  private currentZone: ActiveAudioZone | null = null;
  private onZoneChange: ((zone: AudioZoneConfig | null) => void) | null = null;

  constructor() {}

  /** Register all audio zones from config */
  registerAll(zones: AudioZoneConfig[]): void {
    for (const config of zones) {
      this.register(config);
    }
  }

  /** Register a single audio zone */
  register(config: AudioZoneConfig): void {
    const center = new THREE.Vector3(config.position[0], config.position[1], config.position[2]);
    this.zones.set(config.id, { config, center });
  }

  /** Set callback for when active zone changes */
  onActiveZoneChange(callback: (zone: AudioZoneConfig | null) => void): void {
    this.onZoneChange = callback;
  }

  /** Update with player position — call each frame */
  update(playerPosition: THREE.Vector3): void {
    let activeZone: ActiveAudioZone | null = null;
    let closestDist = Infinity;

    for (const zone of this.zones.values()) {
      const dist = playerPosition.distanceTo(zone.center);
      if (dist <= zone.config.radius && dist < closestDist) {
        activeZone = zone;
        closestDist = dist;
      }
    }

    if (activeZone !== this.currentZone) {
      this.currentZone = activeZone;
      if (this.onZoneChange) {
        this.onZoneChange(activeZone?.config ?? null);
      }
    }
  }

  /** Get the currently active audio zone */
  getCurrentZone(): AudioZoneConfig | null {
    return this.currentZone?.config ?? null;
  }

  /** Get volume factor based on distance from zone center (for crossfade) */
  getVolumeFactor(playerPosition: THREE.Vector3): number {
    if (!this.currentZone) return 0;
    const dist = playerPosition.distanceTo(this.currentZone.center);
    const radius = this.currentZone.config.radius;
    // Volume falls off toward edge of zone
    return Math.max(0, 1 - (dist / radius)) * this.currentZone.config.volume;
  }
}
