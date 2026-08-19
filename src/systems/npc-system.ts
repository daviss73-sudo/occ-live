/**
 * OCC Live - NPC System (Part 6 Updated)
 * Ambient NPC characters that populate the Main Union when few or no
 * real students are present. NPCs are NOT presented as actual students —
 * they are ambient world characters that prevent the space from feeling empty.
 *
 * Part 6 additions:
 * - New behaviors: gather (cluster near points of interest), explore
 *   (wander between zones), cafe usage (sit/drink cycle), play (ball pit/swing)
 * - Dynamic zone distribution: NPCs prefer areas with activity
 * - Stage proximity: NPCs gather near stage during events
 * - Configurable density levels (low/medium/high)
 * - Zone-aware behavior transitions (NPC walks to cafe → sits → drinks → leaves)
 * - NPCs never display names, labels, or identifying information
 */

import * as THREE from 'three';
import type { NPCConfig, NPCPopulationConfig, Vec3 } from '../types/index.ts';

// ─── Extended NPC State ──────────────────────────────────────────────────────

type NPCActivityState =
  | 'idle'
  | 'walking'
  | 'walking_to_zone'
  | 'sitting'
  | 'dancing'
  | 'gathering'
  | 'exploring'
  | 'playing'
  | 'drinking'
  | 'waiting';

interface ActiveNPC {
  config: NPCConfig;
  mesh: THREE.Group;
  walkTarget: THREE.Vector3 | null;
  walkTimer: number;
  origin: THREE.Vector3;
  /** Current detailed activity state */
  activityState: NPCActivityState;
  /** Timer for current activity duration */
  activityTimer: number;
  /** Target zone for zone-aware behaviors */
  targetZone: string | null;
  /** Phase offset for animation variation */
  phaseOffset: number;
}

// ─── NPC Density Levels ──────────────────────────────────────────────────────

export type NPCDensityLevel = 'low' | 'medium' | 'high' | 'custom';

const DENSITY_MULTIPLIERS: Record<NPCDensityLevel, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
  custom: 1.0,
};

// ─── Zone Attraction Points ──────────────────────────────────────────────────

export interface NPCZoneAttraction {
  zoneId: string;
  position: Vec3;
  radius: number;
  /** How strongly this zone attracts NPCs (0-1) */
  weight: number;
  /** Maximum NPCs that should gather here */
  maxNPCs: number;
  /** Behaviors NPCs can exhibit in this zone */
  behaviors: NPCActivityState[];
}

// ─── NPC System ──────────────────────────────────────────────────────────────

export class NPCSystem {
  private npcs: Map<string, ActiveNPC> = new Map();
  private scene: THREE.Scene;
  private populationConfig: NPCPopulationConfig[] = [];
  private currentPlayerCount: number = 0;
  private maxVisibleNPCs: number = 15;
  private densityLevel: NPCDensityLevel = 'medium';
  private densityMultiplier: number = 1.0;
  private zoneAttractions: Map<string, NPCZoneAttraction> = new Map();
  private stageEventActive: boolean = false;
  private stagePosition: THREE.Vector3 = new THREE.Vector3(0, 0, -30);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // ─── Registration ──────────────────────────────────────────────────────

  /** Register all NPCs from config */
  registerAll(npcs: NPCConfig[], populationConfig: NPCPopulationConfig[]): void {
    this.populationConfig = populationConfig;
    for (const npc of npcs) {
      if (npc.enabled) {
        this.register(npc);
      }
    }
    this.updateVisibility();
  }

  /** Register a single NPC */
  register(config: NPCConfig): void {
    const mesh = this.createNPCMesh(config);
    const origin = new THREE.Vector3(config.position[0], config.position[1], config.position[2]);
    mesh.position.copy(origin);

    const activeNPC: ActiveNPC = {
      config,
      mesh,
      walkTarget: null,
      walkTimer: Math.random() * 5,
      origin: origin.clone(),
      activityState: this.behaviorToActivityState(config.behavior),
      activityTimer: 5 + Math.random() * 15,
      targetZone: null,
      phaseOffset: Math.random() * Math.PI * 2,
    };

    this.npcs.set(config.id, activeNPC);
    this.scene.add(mesh);
  }

  /** Register zone attraction points for NPC distribution */
  registerZoneAttractions(attractions: NPCZoneAttraction[]): void {
    for (const attraction of attractions) {
      this.zoneAttractions.set(attraction.zoneId, attraction);
    }
  }

  // ─── Update Loop ───────────────────────────────────────────────────────

  /** Update NPC behaviors — call each frame */
  update(deltaTime: number): void {
    for (const npc of this.npcs.values()) {
      if (!npc.mesh.visible) continue;

      // Decrement activity timer
      npc.activityTimer -= deltaTime;

      switch (npc.activityState) {
        case 'idle':
          this.updateIdle(npc, deltaTime);
          break;
        case 'walking':
          this.updateWalk(npc, deltaTime);
          break;
        case 'walking_to_zone':
          this.updateWalkToZone(npc, deltaTime);
          break;
        case 'dancing':
          this.updateDance(npc, deltaTime);
          break;
        case 'sitting':
          this.updateSitting(npc, deltaTime);
          break;
        case 'gathering':
          this.updateGathering(npc, deltaTime);
          break;
        case 'exploring':
          this.updateExploring(npc, deltaTime);
          break;
        case 'playing':
          this.updatePlaying(npc, deltaTime);
          break;
        case 'drinking':
          this.updateDrinking(npc, deltaTime);
          break;
        case 'waiting':
          this.updateWaiting(npc, deltaTime);
          break;
      }

      // Check for activity transitions
      if (npc.activityTimer <= 0) {
        this.transitionActivity(npc);
      }
    }
  }

  // ─── Population Control ────────────────────────────────────────────────

  /** Update player count and adjust NPC visibility */
  setPlayerCount(count: number): void {
    this.currentPlayerCount = count;
    this.updateVisibility();
  }

  /** Set NPC density level */
  setDensityLevel(level: NPCDensityLevel): void {
    this.densityLevel = level;
    this.densityMultiplier = DENSITY_MULTIPLIERS[level];
    this.updateVisibility();
  }

  /** Set custom density multiplier (for dev controls) */
  setCustomDensity(multiplier: number): void {
    this.densityLevel = 'custom';
    this.densityMultiplier = Math.max(0, Math.min(3, multiplier));
    this.updateVisibility();
  }

  /** Get current density level */
  getDensityLevel(): NPCDensityLevel {
    return this.densityLevel;
  }

  // ─── Stage Event Integration ───────────────────────────────────────────

  /** Notify the NPC system that a stage event has started */
  setStageEventActive(active: boolean): void {
    this.stageEventActive = active;

    if (active) {
      // Make some NPCs gravitate toward the stage
      this.redirectNPCsToStage();
    }
  }

  /** Set the stage position (for attraction) */
  setStagePosition(position: Vec3): void {
    this.stagePosition.set(position[0], position[1], position[2]);
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get all active (visible) NPCs */
  getActiveNPCs(): ActiveNPC[] {
    return Array.from(this.npcs.values()).filter(n => n.mesh.visible);
  }

  /** Get NPC count by behavior */
  getCountByBehavior(behavior: NPCActivityState): number {
    let count = 0;
    for (const npc of this.npcs.values()) {
      if (npc.mesh.visible && npc.activityState === behavior) count++;
    }
    return count;
  }

  /** Get NPCs in a specific zone */
  getNPCsInZone(zoneId: string): ActiveNPC[] {
    return Array.from(this.npcs.values()).filter(
      n => n.mesh.visible && n.config.zoneId === zoneId
    );
  }

  /** Get total visible NPC count */
  getVisibleCount(): number {
    let count = 0;
    for (const npc of this.npcs.values()) {
      if (npc.mesh.visible) count++;
    }
    return count;
  }

  /** Get debug info */
  getDebugInfo(): { total: number; visible: number; density: string; behaviors: Record<string, number> } {
    const behaviors: Record<string, number> = {};
    let visible = 0;
    for (const npc of this.npcs.values()) {
      if (npc.mesh.visible) {
        visible++;
        behaviors[npc.activityState] = (behaviors[npc.activityState] ?? 0) + 1;
      }
    }
    return {
      total: this.npcs.size,
      visible,
      density: `${this.densityLevel} (${this.densityMultiplier.toFixed(1)}x)`,
      behaviors,
    };
  }

  /** Remove all NPCs */
  dispose(): void {
    for (const npc of this.npcs.values()) {
      this.scene.remove(npc.mesh);
    }
    this.npcs.clear();
  }

  // ─── Behavior Updates ──────────────────────────────────────────────────

  private updateIdle(npc: ActiveNPC, _dt: number): void {
    const time = performance.now() * 0.001;
    // Subtle breathing/sway
    npc.mesh.position.y = npc.origin.y + Math.sin(time + npc.phaseOffset) * 0.02;
    // Occasional look-around
    npc.mesh.rotation.y = Math.sin(time * 0.2 + npc.phaseOffset * 2) * 0.3;
  }

  private updateWalk(npc: ActiveNPC, dt: number): void {
    npc.walkTimer -= dt;

    if (npc.walkTimer <= 0 || !npc.walkTarget) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * npc.config.walkRadius;
      npc.walkTarget = new THREE.Vector3(
        npc.origin.x + Math.cos(angle) * dist,
        npc.origin.y,
        npc.origin.z + Math.sin(angle) * dist
      );
      npc.walkTimer = 3 + Math.random() * 5;
    }

    this.moveToward(npc, npc.walkTarget, npc.config.walkSpeed, dt);
  }

  private updateWalkToZone(npc: ActiveNPC, dt: number): void {
    if (!npc.walkTarget) {
      // Arrived or no target — transition to zone behavior
      npc.activityState = 'idle';
      npc.activityTimer = 3 + Math.random() * 8;
      return;
    }

    const arrived = this.moveToward(npc, npc.walkTarget, npc.config.walkSpeed * 1.2, dt);
    if (arrived) {
      // Arrived at zone — pick a zone-appropriate activity
      if (npc.targetZone) {
        this.assignZoneBehavior(npc, npc.targetZone);
      } else {
        npc.activityState = 'idle';
        npc.activityTimer = 5 + Math.random() * 10;
      }
    }
  }

  private updateDance(npc: ActiveNPC, dt: number): void {
    const time = performance.now() * 0.003;
    // Bobbing dance with arm movement simulation
    npc.mesh.position.y = npc.origin.y + Math.sin(time + npc.phaseOffset) * 0.12;
    npc.mesh.rotation.y += dt * (1.5 + Math.sin(npc.phaseOffset) * 0.5);
    // Subtle lateral sway
    npc.mesh.position.x = npc.origin.x + Math.sin(time * 0.7 + npc.phaseOffset) * 0.1;
  }

  private updateSitting(npc: ActiveNPC, _dt: number): void {
    const time = performance.now() * 0.001;
    // Subtle breathing while sitting
    npc.mesh.position.y = npc.origin.y - 0.3 + Math.sin(time + npc.phaseOffset) * 0.01;
  }

  private updateGathering(npc: ActiveNPC, dt: number): void {
    // NPCs gathering near a point of interest — subtle milling around
    const time = performance.now() * 0.001;
    const gatherRadius = 2;
    const targetX = npc.origin.x + Math.sin(time * 0.3 + npc.phaseOffset) * gatherRadius;
    const targetZ = npc.origin.z + Math.cos(time * 0.2 + npc.phaseOffset * 1.5) * gatherRadius;

    const target = new THREE.Vector3(targetX, npc.origin.y, targetZ);
    this.moveToward(npc, target, 0.5, dt);

    // Face center of gathering
    const toCenter = npc.origin.clone().sub(npc.mesh.position);
    if (toCenter.lengthSq() > 0.01) {
      npc.mesh.rotation.y = Math.atan2(toCenter.x, toCenter.z);
    }
  }

  private updateExploring(npc: ActiveNPC, dt: number): void {
    npc.walkTimer -= dt;

    if (npc.walkTimer <= 0 || !npc.walkTarget) {
      // Pick a longer-range random target (exploring covers more ground)
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 15;
      npc.walkTarget = new THREE.Vector3(
        npc.origin.x + Math.cos(angle) * dist,
        npc.origin.y,
        npc.origin.z + Math.sin(angle) * dist
      );
      npc.walkTimer = 5 + Math.random() * 10;
    }

    const arrived = this.moveToward(npc, npc.walkTarget, npc.config.walkSpeed * 0.8, dt);
    if (arrived) {
      // Pause and look around before moving on
      npc.walkTarget = null;
      npc.walkTimer = 2 + Math.random() * 4;
      // Face a random direction while paused
      npc.mesh.rotation.y = Math.random() * Math.PI * 2;
    }
  }

  private updatePlaying(npc: ActiveNPC, dt: number): void {
    // Playful bouncy behavior (ball pit, near swings)
    const time = performance.now() * 0.003;
    npc.mesh.position.y = npc.origin.y + Math.abs(Math.sin(time + npc.phaseOffset)) * 0.15;

    // Small random movement within play area
    const playRadius = 2;
    const targetX = npc.origin.x + Math.sin(time * 0.5 + npc.phaseOffset) * playRadius;
    const targetZ = npc.origin.z + Math.cos(time * 0.4 + npc.phaseOffset) * playRadius;
    const target = new THREE.Vector3(targetX, npc.origin.y, targetZ);
    this.moveToward(npc, target, 1.0, dt);
  }

  private updateDrinking(npc: ActiveNPC, _dt: number): void {
    // Standing/sitting with periodic "sip" motion
    const time = performance.now() * 0.001;
    // Subtle arm raise motion (simulated by slight forward tilt)
    const sipCycle = Math.sin(time * 0.3 + npc.phaseOffset);
    if (sipCycle > 0.8) {
      npc.mesh.rotation.x = -0.05; // Slight forward tilt = "sipping"
    } else {
      npc.mesh.rotation.x = 0;
    }
  }

  private updateWaiting(npc: ActiveNPC, _dt: number): void {
    const time = performance.now() * 0.001;
    // Weight shift while waiting
    npc.mesh.position.x = npc.origin.x + Math.sin(time * 0.4 + npc.phaseOffset) * 0.05;
    // Look around periodically
    npc.mesh.rotation.y = npc.origin.y + Math.sin(time * 0.15 + npc.phaseOffset) * 0.5;
  }

  // ─── Activity Transitions ──────────────────────────────────────────────

  private transitionActivity(npc: ActiveNPC): void {
    // Pick a new activity based on the NPC's zone and config
    const zone = npc.config.zoneId;
    const behavior = npc.config.behavior;

    // Stage event override: some NPCs should gather near stage
    if (this.stageEventActive && Math.random() < 0.3) {
      npc.walkTarget = this.stagePosition.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10)
      );
      npc.activityState = 'walking_to_zone';
      npc.targetZone = 'main_stage';
      npc.activityTimer = 20 + Math.random() * 30;
      return;
    }

    // Zone-aware transitions
    switch (behavior) {
      case 'walk':
        this.transitionWalker(npc);
        break;
      case 'idle':
        this.transitionIdler(npc);
        break;
      case 'dance':
        // Dancers stay dancing but may briefly pause
        npc.activityState = Math.random() < 0.8 ? 'dancing' : 'idle';
        npc.activityTimer = 8 + Math.random() * 15;
        break;
      case 'sit':
        // Sitting NPCs occasionally adjust or stand briefly
        npc.activityState = Math.random() < 0.9 ? 'sitting' : 'idle';
        npc.activityTimer = 10 + Math.random() * 20;
        break;
      case 'gather':
        npc.activityState = 'gathering';
        npc.activityTimer = 10 + Math.random() * 20;
        break;
      case 'explore':
        this.transitionExplorer(npc);
        break;
      case 'play':
        npc.activityState = Math.random() < 0.7 ? 'playing' : 'idle';
        npc.activityTimer = 8 + Math.random() * 12;
        break;
      default:
        npc.activityState = 'idle';
        npc.activityTimer = 5 + Math.random() * 10;
    }
  }

  private transitionWalker(npc: ActiveNPC): void {
    const roll = Math.random();
    if (roll < 0.4) {
      npc.activityState = 'walking';
      npc.activityTimer = 8 + Math.random() * 12;
    } else if (roll < 0.6) {
      npc.activityState = 'idle';
      npc.activityTimer = 3 + Math.random() * 6;
    } else if (roll < 0.75) {
      // Walk to a random zone
      this.sendToRandomZone(npc);
    } else if (roll < 0.85) {
      npc.activityState = 'gathering';
      npc.activityTimer = 10 + Math.random() * 15;
    } else {
      npc.activityState = 'exploring';
      npc.activityTimer = 12 + Math.random() * 20;
    }
  }

  private transitionIdler(npc: ActiveNPC): void {
    const roll = Math.random();
    if (roll < 0.5) {
      npc.activityState = 'idle';
      npc.activityTimer = 5 + Math.random() * 10;
    } else if (roll < 0.7) {
      npc.activityState = 'walking';
      npc.walkTarget = null;
      npc.activityTimer = 5 + Math.random() * 8;
    } else if (roll < 0.85) {
      npc.activityState = 'waiting';
      npc.activityTimer = 4 + Math.random() * 8;
    } else {
      this.sendToRandomZone(npc);
    }
  }

  private transitionExplorer(npc: ActiveNPC): void {
    const roll = Math.random();
    if (roll < 0.5) {
      npc.activityState = 'exploring';
      npc.activityTimer = 15 + Math.random() * 25;
    } else if (roll < 0.7) {
      npc.activityState = 'idle';
      npc.activityTimer = 3 + Math.random() * 5;
    } else {
      this.sendToRandomZone(npc);
    }
  }

  private sendToRandomZone(npc: ActiveNPC): void {
    const zones = Array.from(this.zoneAttractions.values());
    if (zones.length === 0) {
      npc.activityState = 'walking';
      npc.activityTimer = 8 + Math.random() * 10;
      return;
    }

    // Weighted random selection based on attraction weight
    const totalWeight = zones.reduce((sum, z) => sum + z.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected = zones[0];

    for (const zone of zones) {
      roll -= zone.weight;
      if (roll <= 0) {
        selected = zone;
        break;
      }
    }

    // Set walk target to the zone
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * selected.radius,
      0,
      (Math.random() - 0.5) * selected.radius
    );
    npc.walkTarget = new THREE.Vector3(
      selected.position[0] + offset.x,
      selected.position[1],
      selected.position[2] + offset.z
    );
    npc.targetZone = selected.zoneId;
    npc.activityState = 'walking_to_zone';
    npc.activityTimer = 30 + Math.random() * 30;
  }

  private assignZoneBehavior(npc: ActiveNPC, zoneId: string): void {
    const attraction = this.zoneAttractions.get(zoneId);
    if (!attraction || attraction.behaviors.length === 0) {
      npc.activityState = 'idle';
      npc.activityTimer = 5 + Math.random() * 10;
      return;
    }

    // Pick a random behavior appropriate for this zone
    const behavior = attraction.behaviors[Math.floor(Math.random() * attraction.behaviors.length)];
    npc.activityState = behavior;
    npc.activityTimer = 8 + Math.random() * 20;

    // Update origin to current position (so idle/gather behaviors use this as center)
    npc.origin.copy(npc.mesh.position);
  }

  private redirectNPCsToStage(): void {
    const allNPCs = Array.from(this.npcs.values()).filter(n => n.mesh.visible);
    const toRedirect = Math.floor(allNPCs.length * 0.3); // 30% of NPCs gravitate to stage

    for (let i = 0; i < toRedirect && i < allNPCs.length; i++) {
      const npc = allNPCs[i];
      if (npc.activityState === 'sitting') continue; // Don't disturb sitting NPCs

      npc.walkTarget = this.stagePosition.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 12, 0, Math.random() * 8)
      );
      npc.targetZone = 'main_stage';
      npc.activityState = 'walking_to_zone';
      npc.activityTimer = 20 + Math.random() * 40;
    }
  }

  // ─── Movement Helper ───────────────────────────────────────────────────

  /** Move NPC toward a target. Returns true if arrived. */
  private moveToward(npc: ActiveNPC, target: THREE.Vector3, speed: number, dt: number): boolean {
    const dir = target.clone().sub(npc.mesh.position);
    dir.y = 0;
    const distance = dir.length();

    if (distance > 0.4) {
      dir.normalize();
      npc.mesh.position.x += dir.x * speed * dt;
      npc.mesh.position.z += dir.z * speed * dt;
      npc.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      return false;
    }

    return true;
  }

  // ─── Population Control ────────────────────────────────────────────────

  private updateVisibility(): void {
    let targetCount = this.maxVisibleNPCs;
    for (const rule of this.populationConfig) {
      if (this.currentPlayerCount >= rule.playerRange[0] && this.currentPlayerCount <= rule.playerRange[1]) {
        targetCount = rule.npcCount;
        break;
      }
    }

    // Apply density multiplier
    targetCount = Math.round(targetCount * this.densityMultiplier);

    const allNPCs = Array.from(this.npcs.values());
    for (let i = 0; i < allNPCs.length; i++) {
      allNPCs[i].mesh.visible = i < targetCount;
    }
  }

  // ─── Utility ───────────────────────────────────────────────────────────

  private behaviorToActivityState(behavior: string): NPCActivityState {
    switch (behavior) {
      case 'walk': return 'walking';
      case 'idle': return 'idle';
      case 'sit': return 'sitting';
      case 'dance': return 'dancing';
      case 'gather': return 'gathering';
      case 'explore': return 'exploring';
      case 'play': return 'playing';
      default: return 'idle';
    }
  }

  // ─── NPC Mesh (Placeholder) ────────────────────────────────────────────

  private createNPCMesh(config: NPCConfig): THREE.Group {
    const group = new THREE.Group();
    group.name = `npc_${config.id}`;
    group.userData = { npcId: config.id, behavior: config.behavior, isNPC: true };

    // Random color variation (distinct from player avatars — muted tones)
    const hue = Math.random();
    const bodyColor = new THREE.Color().setHSL(hue, 0.3, 0.45);
    const headColor = new THREE.Color().setHSL(0.08, 0.4, 0.65);

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.25, 0.8, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.2, 10, 10);
    const headMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.55;
    head.castShadow = true;
    head.name = 'head';
    group.add(head);

    // Sitting NPCs are positioned lower
    if (config.behavior === 'sit') {
      group.scale.y = 0.85;
      group.position.y = -0.2;
    }

    return group;
  }
}
