/**
 * OCC Live - Activity Area System (Part 6)
 * Reusable framework for configuring and managing Main Union activity zones.
 * Each area has a configurable definition with state management, occupancy
 * tracking, open/closed states, and transition logic.
 *
 * Design:
 * - Data-driven: new areas added via config without code changes
 * - State machine per area: open/closed/event_only/maintenance
 * - Occupancy tracking for social density feedback
 * - Transition callbacks for enter/exit with animation hooks
 * - Integrates with existing zone, audio, and interaction systems
 * - 24/7 operation: areas remain open without requiring events
 */

import * as THREE from 'three';
import type { Vec3 } from '../types/index.ts';

// ─── Activity Area Types ─────────────────────────────────────────────────────

export type ActivityAreaState = 'open' | 'closed' | 'event_only' | 'maintenance';

export type ActivityType =
  | 'social'
  | 'dance'
  | 'relaxation'
  | 'water'
  | 'recreation'
  | 'food_drink'
  | 'performance'
  | 'information'
  | 'mini_game';

export interface ActivityAreaConfig {
  id: string;
  displayName: string;
  description: string;
  activityType: ActivityType;
  position: Vec3;
  radius: number;
  state: ActivityAreaState;
  /** Interaction types available in this area */
  interactionTypes: string[];
  /** Zone IDs this activity area maps to */
  zoneIds: string[];
  /** Audio zone associated with this area */
  audioZoneId: string | null;
  /** NPC anchor points for ambient population */
  npcAnchors: Vec3[];
  /** Maximum recommended occupancy (soft cap for density feedback) */
  maxOccupancy: number;
  /** Seating positions available in this area */
  seatingPositions: Vec3[];
  /** Spawn points within this area */
  spawnPoints: Vec3[];
  /** Whether this area is currently enabled */
  enabled: boolean;
  /** Optional: time-based availability (null = always open) */
  schedule: ActivitySchedule | null;
}

export interface ActivitySchedule {
  /** Days of week (0=Sun, 6=Sat) when available, null = all days */
  days: number[] | null;
  /** Start hour (0-23), null = no time restriction */
  startHour: number | null;
  /** End hour (0-23), null = no time restriction */
  endHour: number | null;
}

// ─── Activity Area Runtime State ─────────────────────────────────────────────

interface ActivityAreaRuntime {
  config: ActivityAreaConfig;
  state: ActivityAreaState;
  occupants: Set<string>;        // Session IDs of players in the area
  npcOccupants: Set<string>;     // NPC IDs in the area
  lastStateChange: number;
  center: THREE.Vector3;
}

// ─── Activity Transition Events ──────────────────────────────────────────────

export interface ActivityTransitionEvent {
  areaId: string;
  sessionId: string;
  type: 'enter' | 'exit';
  previousArea: string | null;
  timestamp: number;
}

export type ActivityTransitionCallback = (event: ActivityTransitionEvent) => void;

// ─── Activity Area System ────────────────────────────────────────────────────

export class ActivityAreaSystem {
  private areas: Map<string, ActivityAreaRuntime> = new Map();
  private playerAreas: Map<string, string> = new Map(); // sessionId → current areaId
  private transitionCallbacks: ActivityTransitionCallback[] = [];
  private onOccupancyChange: ((areaId: string, count: number, max: number) => void) | null = null;

  constructor() {}

  // ─── Registration ──────────────────────────────────────────────────────

  /** Register all activity areas from config array */
  registerAll(configs: ActivityAreaConfig[]): void {
    for (const config of configs) {
      this.register(config);
    }
  }

  /** Register a single activity area */
  register(config: ActivityAreaConfig): void {
    this.areas.set(config.id, {
      config,
      state: config.state,
      occupants: new Set(),
      npcOccupants: new Set(),
      lastStateChange: Date.now(),
      center: new THREE.Vector3(config.position[0], config.position[1], config.position[2]),
    });
  }

  /** Add a new activity area at runtime (for dynamic additions) */
  addArea(config: ActivityAreaConfig): void {
    this.register(config);
  }

  /** Remove an activity area */
  removeArea(id: string): void {
    this.areas.delete(id);
  }

  // ─── State Management ──────────────────────────────────────────────────

  /** Set the state of an activity area */
  setAreaState(areaId: string, state: ActivityAreaState): void {
    const area = this.areas.get(areaId);
    if (!area) return;

    const previousState = area.state;
    area.state = state;
    area.lastStateChange = Date.now();

    // If closing, notify all occupants
    if (state === 'closed' && previousState === 'open') {
      for (const sessionId of area.occupants) {
        this.exitArea(sessionId, areaId);
      }
    }
  }

  /** Get the current state of an area */
  getAreaState(areaId: string): ActivityAreaState | null {
    return this.areas.get(areaId)?.state ?? null;
  }

  /** Check if an area is currently accessible */
  isAreaAccessible(areaId: string): boolean {
    const area = this.areas.get(areaId);
    if (!area) return false;
    if (!area.config.enabled) return false;
    if (area.state !== 'open') return false;

    // Check schedule if defined
    if (area.config.schedule) {
      return this.isWithinSchedule(area.config.schedule);
    }

    return true;
  }

  // ─── Player Tracking ───────────────────────────────────────────────────

  /**
   * Update a player's position and determine which activity area they're in.
   * Automatically handles enter/exit transitions.
   */
  updatePlayerPosition(sessionId: string, position: THREE.Vector3): string | null {
    const currentArea = this.playerAreas.get(sessionId) ?? null;
    let newArea: string | null = null;
    let closestDist = Infinity;

    // Find which area the player is in (closest center within radius)
    for (const [id, area] of this.areas) {
      if (!this.isAreaAccessible(id)) continue;

      const dist = position.distanceTo(area.center);
      if (dist <= area.config.radius && dist < closestDist) {
        newArea = id;
        closestDist = dist;
      }
    }

    // Handle transitions
    if (newArea !== currentArea) {
      if (currentArea) {
        this.exitArea(sessionId, currentArea);
      }
      if (newArea) {
        this.enterArea(sessionId, newArea, currentArea);
      }
    }

    return newArea;
  }

  /** Manually enter a player into an area (e.g. from interaction) */
  enterArea(sessionId: string, areaId: string, previousArea: string | null = null): void {
    const area = this.areas.get(areaId);
    if (!area) return;

    area.occupants.add(sessionId);
    this.playerAreas.set(sessionId, areaId);

    // Fire transition event
    const event: ActivityTransitionEvent = {
      areaId,
      sessionId,
      type: 'enter',
      previousArea,
      timestamp: Date.now(),
    };
    this.fireTransition(event);

    // Occupancy notification
    this.onOccupancyChange?.(areaId, area.occupants.size, area.config.maxOccupancy);
  }

  /** Remove a player from an area */
  exitArea(sessionId: string, areaId: string): void {
    const area = this.areas.get(areaId);
    if (!area) return;

    area.occupants.delete(sessionId);
    if (this.playerAreas.get(sessionId) === areaId) {
      this.playerAreas.delete(sessionId);
    }

    // Fire transition event
    const event: ActivityTransitionEvent = {
      areaId,
      sessionId,
      type: 'exit',
      previousArea: null,
      timestamp: Date.now(),
    };
    this.fireTransition(event);

    // Occupancy notification
    this.onOccupancyChange?.(areaId, area.occupants.size, area.config.maxOccupancy);
  }

  /** Remove a player entirely (disconnect) */
  removePlayer(sessionId: string): void {
    const currentArea = this.playerAreas.get(sessionId);
    if (currentArea) {
      this.exitArea(sessionId, currentArea);
    }
  }

  // ─── NPC Tracking ─────────────────────────────────────────────────────

  /** Register an NPC in an area */
  addNPC(npcId: string, areaId: string): void {
    const area = this.areas.get(areaId);
    if (area) {
      area.npcOccupants.add(npcId);
    }
  }

  /** Remove an NPC from an area */
  removeNPC(npcId: string, areaId: string): void {
    const area = this.areas.get(areaId);
    if (area) {
      area.npcOccupants.delete(npcId);
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get the area a player is currently in */
  getPlayerArea(sessionId: string): string | null {
    return this.playerAreas.get(sessionId) ?? null;
  }

  /** Get the config for an area */
  getAreaConfig(areaId: string): ActivityAreaConfig | null {
    return this.areas.get(areaId)?.config ?? null;
  }

  /** Get all registered area configs */
  getAllAreas(): ActivityAreaConfig[] {
    return Array.from(this.areas.values()).map(a => a.config);
  }

  /** Get all open areas */
  getOpenAreas(): ActivityAreaConfig[] {
    return Array.from(this.areas.values())
      .filter(a => a.state === 'open' && a.config.enabled)
      .map(a => a.config);
  }

  /** Get the current occupancy of an area */
  getOccupancy(areaId: string): { players: number; npcs: number; total: number; max: number } {
    const area = this.areas.get(areaId);
    if (!area) return { players: 0, npcs: 0, total: 0, max: 0 };
    return {
      players: area.occupants.size,
      npcs: area.npcOccupants.size,
      total: area.occupants.size + area.npcOccupants.size,
      max: area.config.maxOccupancy,
    };
  }

  /** Get the total number of players across all areas */
  getTotalOccupancy(): number {
    let total = 0;
    for (const area of this.areas.values()) {
      total += area.occupants.size;
    }
    return total;
  }

  /** Get all players in a specific area */
  getPlayersInArea(areaId: string): string[] {
    const area = this.areas.get(areaId);
    return area ? Array.from(area.occupants) : [];
  }

  /** Check if an area is at or above recommended max occupancy */
  isAreaFull(areaId: string): boolean {
    const area = this.areas.get(areaId);
    if (!area) return false;
    return area.occupants.size >= area.config.maxOccupancy;
  }

  /** Get areas sorted by current occupancy (for NPC distribution) */
  getAreasByOccupancy(): Array<{ id: string; occupancy: number; max: number }> {
    return Array.from(this.areas.entries())
      .filter(([, a]) => a.state === 'open' && a.config.enabled)
      .map(([id, a]) => ({
        id,
        occupancy: a.occupants.size,
        max: a.config.maxOccupancy,
      }))
      .sort((a, b) => a.occupancy - b.occupancy);
  }

  // ─── Callbacks ─────────────────────────────────────────────────────────

  /** Register a callback for activity area transitions */
  onTransition(callback: ActivityTransitionCallback): void {
    this.transitionCallbacks.push(callback);
  }

  /** Set callback for occupancy changes */
  setOnOccupancyChange(callback: (areaId: string, count: number, max: number) => void): void {
    this.onOccupancyChange = callback;
  }

  // ─── Developer Controls ────────────────────────────────────────────────

  /** Force an area open (dev mode) */
  forceOpen(areaId: string): void {
    this.setAreaState(areaId, 'open');
  }

  /** Force an area closed (dev mode) */
  forceClose(areaId: string): void {
    this.setAreaState(areaId, 'closed');
  }

  /** Reset all areas to their configured default state */
  resetAll(): void {
    for (const area of this.areas.values()) {
      area.state = area.config.state;
      area.occupants.clear();
      area.npcOccupants.clear();
    }
    this.playerAreas.clear();
  }

  /** Get debug info about all areas */
  getDebugInfo(): Array<{ id: string; state: ActivityAreaState; players: number; npcs: number }> {
    return Array.from(this.areas.entries()).map(([id, area]) => ({
      id,
      state: area.state,
      players: area.occupants.size,
      npcs: area.npcOccupants.size,
    }));
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private fireTransition(event: ActivityTransitionEvent): void {
    for (const cb of this.transitionCallbacks) {
      cb(event);
    }
  }

  private isWithinSchedule(schedule: ActivitySchedule): boolean {
    const now = new Date();

    // Check day of week
    if (schedule.days && !schedule.days.includes(now.getDay())) {
      return false;
    }

    // Check time range
    const hour = now.getHours();
    if (schedule.startHour !== null && schedule.endHour !== null) {
      if (schedule.startHour <= schedule.endHour) {
        return hour >= schedule.startHour && hour < schedule.endHour;
      } else {
        // Wraps midnight (e.g. 22:00 to 06:00)
        return hour >= schedule.startHour || hour < schedule.endHour;
      }
    }

    return true;
  }
}
