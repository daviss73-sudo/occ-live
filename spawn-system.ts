/**
 * OCC Live - Spawn System
 * Manages configurable spawn points for all zones and portals.
 * The active spawn determines where players appear on load/teleport.
 */

import type { SpawnPointConfig, Vec3 } from '../types/index.ts';

export class SpawnSystem {
  private spawnPoints: Map<string, SpawnPointConfig> = new Map();
  private defaultSpawnId: string = 'main_union_spawn';

  constructor() {}

  /** Register all spawn points from config */
  registerAll(spawns: SpawnPointConfig[]): void {
    for (const spawn of spawns) {
      this.spawnPoints.set(spawn.id, spawn);
    }
  }

  /** Get the default spawn point (main_union_spawn or first active) */
  getDefaultSpawn(): SpawnPointConfig | undefined {
    const defaultSpawn = this.spawnPoints.get(this.defaultSpawnId);
    if (defaultSpawn?.active) return defaultSpawn;

    // Fallback to first active spawn
    for (const spawn of this.spawnPoints.values()) {
      if (spawn.active) return spawn;
    }
    return undefined;
  }

  /** Get a spawn point by ID */
  getSpawn(id: string): SpawnPointConfig | undefined {
    return this.spawnPoints.get(id);
  }

  /** Get spawn position as Vec3 */
  getSpawnPosition(id: string): Vec3 | undefined {
    return this.spawnPoints.get(id)?.position;
  }

  /** Get all active spawn points */
  getActiveSpawns(): SpawnPointConfig[] {
    return Array.from(this.spawnPoints.values()).filter(s => s.active);
  }

  /** Get spawn points for a specific zone */
  getSpawnsByZone(zoneId: string): SpawnPointConfig[] {
    return Array.from(this.spawnPoints.values()).filter(s => s.zoneId === zoneId);
  }

  /** Set the default spawn point ID */
  setDefaultSpawn(id: string): void {
    this.defaultSpawnId = id;
  }

  /** Activate/deactivate a spawn point */
  setActive(id: string, active: boolean): void {
    const spawn = this.spawnPoints.get(id);
    if (spawn) {
      spawn.active = active;
    }
  }

  /** Update spawn position */
  updatePosition(id: string, position: Vec3): void {
    const spawn = this.spawnPoints.get(id);
    if (spawn) {
      spawn.position = position;
    }
  }
}
