/**
 * OCC Live - Lazy River Modular Route System (Part 4)
 * Configurable river route using modular GLB segments (straight, corner,
 * curve, entry/exit). Supports waypoint-based floating, looping path,
 * player entry/exit, multiplayer sync, and audio zone.
 * 
 * The route follows the architecture of the Main Union and can be
 * edited without rebuilding river assets.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Vec3 } from '../types/index.ts';
import type { LazyRiverConfig, RiverSegmentConfig } from '../types/pipeline.ts';

// ─── Float State ─────────────────────────────────────────────────────────────

export interface FloatingPlayer {
  sessionId: string;
  waypointIndex: number;
  progress: number;       // 0-1 between current and next waypoint
  mesh: THREE.Object3D;   // Reference to the avatar (for positioning)
}

// ─── Lazy River System ───────────────────────────────────────────────────────

export class LazyRiverSystem {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  private config: LazyRiverConfig;
  private segmentMeshes: Map<string, THREE.Object3D> = new Map();
  private segmentCache: Map<string, THREE.Group> = new Map();
  private floatingPlayers: Map<string, FloatingPlayer> = new Map();
  private routeGroup: THREE.Group;
  private waypointPositions: THREE.Vector3[] = [];
  private totalRouteLength: number = 0;
  private segmentLengths: number[] = [];
  private onPlayerExit: ((sessionId: string) => void) | null = null;

  constructor(scene: THREE.Scene, config: LazyRiverConfig) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.config = config;

    this.routeGroup = new THREE.Group();
    this.routeGroup.name = 'lazy_river';
    this.scene.add(this.routeGroup);

    this.buildWaypointData();
  }

  // ─── Initialization ────────────────────────────────────────────────────

  /** Load and place all river segment GLBs */
  async loadSegments(): Promise<void> {
    for (const segment of this.config.segments) {
      await this.loadSegment(segment);
    }
    console.log(`[LazyRiver] Loaded ${this.config.segments.length} segments`);
  }

  /** Place placeholder geometry for the route (if GLBs unavailable) */
  placePlaceholders(): void {
    for (const segment of this.config.segments) {
      const mesh = this.createSegmentPlaceholder(segment);
      this.segmentMeshes.set(segment.id, mesh);
      this.routeGroup.add(mesh);
    }

    // Draw waypoint path as debug line
    this.drawDebugPath();
  }

  // ─── Player Entry/Exit ─────────────────────────────────────────────────

  /** Enter a player into the lazy river */
  enterRiver(sessionId: string, avatarMesh: THREE.Object3D, entryIndex: number = 0): void {
    if (this.floatingPlayers.has(sessionId)) return;

    // Find closest waypoint to entry point
    const entryPoint = this.config.entryPoints[entryIndex] ?? this.config.entryPoints[0];
    const startWaypoint = this.findClosestWaypoint(entryPoint);

    const floater: FloatingPlayer = {
      sessionId,
      waypointIndex: startWaypoint,
      progress: 0,
      mesh: avatarMesh,
    };

    this.floatingPlayers.set(sessionId, floater);

    // Position avatar at entry
    const pos = this.waypointPositions[startWaypoint];
    avatarMesh.position.set(pos.x, pos.y - 0.3, pos.z); // Slightly submerged
  }

  /** Exit a player from the lazy river */
  exitRiver(sessionId: string): void {
    const floater = this.floatingPlayers.get(sessionId);
    if (!floater) return;

    // Find closest exit point
    const exitPoint = this.findClosestExit(floater.mesh.position);
    floater.mesh.position.set(exitPoint[0], exitPoint[1], exitPoint[2]);

    this.floatingPlayers.delete(sessionId);

    if (this.onPlayerExit) {
      this.onPlayerExit(sessionId);
    }
  }

  /** Set callback for when a player exits */
  onExit(callback: (sessionId: string) => void): void {
    this.onPlayerExit = callback;
  }

  /** Is a player currently in the river? */
  isFloating(sessionId: string): boolean {
    return this.floatingPlayers.has(sessionId);
  }

  // ─── Update (call each frame) ──────────────────────────────────────────

  /** Move all floating players along the route */
  update(dt: number): void {
    for (const floater of this.floatingPlayers.values()) {
      this.advanceFloater(floater, dt);
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get the float position for a player (for multiplayer sync) */
  getFloatState(sessionId: string): { waypointIndex: number; progress: number } | null {
    const floater = this.floatingPlayers.get(sessionId);
    if (!floater) return null;
    return { waypointIndex: floater.waypointIndex, progress: floater.progress };
  }

  /** Set float state from multiplayer sync (remote players) */
  setFloatState(sessionId: string, avatarMesh: THREE.Object3D, waypointIndex: number, progress: number): void {
    let floater = this.floatingPlayers.get(sessionId);
    if (!floater) {
      floater = { sessionId, waypointIndex, progress, mesh: avatarMesh };
      this.floatingPlayers.set(sessionId, floater);
    } else {
      floater.waypointIndex = waypointIndex;
      floater.progress = progress;
    }

    // Position the avatar
    const pos = this.getPositionOnRoute(waypointIndex, progress);
    avatarMesh.position.set(pos.x, pos.y - 0.3, pos.z);
  }

  /** Get all entry points */
  getEntryPoints(): Vec3[] {
    return this.config.entryPoints;
  }

  /** Get all exit points */
  getExitPoints(): Vec3[] {
    return this.config.exitPoints;
  }

  /** Get the total number of waypoints */
  getWaypointCount(): number {
    return this.waypointPositions.length;
  }

  /** Get floating player count */
  getFloatingCount(): number {
    return this.floatingPlayers.size;
  }

  /** Get the route group (for debug/visibility) */
  getRouteGroup(): THREE.Group {
    return this.routeGroup;
  }

  // ─── Private: Movement ─────────────────────────────────────────────────

  private advanceFloater(floater: FloatingPlayer, dt: number): void {
    const speed = this.config.floatSpeed;
    const currentIdx = floater.waypointIndex;
    const nextIdx = this.getNextWaypointIndex(currentIdx);

    // Advance progress
    const segLength = this.segmentLengths[currentIdx] || 1;
    floater.progress += (speed * dt) / segLength;

    // Move to next segment
    if (floater.progress >= 1.0) {
      floater.progress -= 1.0;
      floater.waypointIndex = nextIdx;

      // Check if we've looped and should exit (non-looping config)
      if (!this.config.loop && nextIdx === 0) {
        this.exitRiver(floater.sessionId);
        return;
      }
    }

    // Interpolate position between current and next waypoint
    const pos = this.getPositionOnRoute(floater.waypointIndex, floater.progress);
    floater.mesh.position.set(pos.x, pos.y - 0.3, pos.z);

    // Face movement direction
    const nextPos = this.getPositionOnRoute(floater.waypointIndex, Math.min(floater.progress + 0.1, 0.99));
    const dir = nextPos.clone().sub(pos);
    if (dir.lengthSq() > 0.001) {
      floater.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }

  private getPositionOnRoute(waypointIndex: number, progress: number): THREE.Vector3 {
    const current = this.waypointPositions[waypointIndex];
    const nextIdx = this.getNextWaypointIndex(waypointIndex);
    const next = this.waypointPositions[nextIdx];

    if (!current || !next) return current ?? new THREE.Vector3();

    return current.clone().lerp(next, progress);
  }

  private getNextWaypointIndex(current: number): number {
    if (this.config.loop) {
      return (current + 1) % this.waypointPositions.length;
    }
    return Math.min(current + 1, this.waypointPositions.length - 1);
  }

  // ─── Private: Setup ────────────────────────────────────────────────────

  private buildWaypointData(): void {
    this.waypointPositions = this.config.waypoints.map(
      wp => new THREE.Vector3(wp[0], wp[1], wp[2])
    );

    // Calculate segment lengths
    this.segmentLengths = [];
    this.totalRouteLength = 0;
    for (let i = 0; i < this.waypointPositions.length; i++) {
      const next = this.waypointPositions[(i + 1) % this.waypointPositions.length];
      const len = this.waypointPositions[i].distanceTo(next);
      this.segmentLengths.push(len);
      this.totalRouteLength += len;
    }
  }

  private async loadSegment(segment: RiverSegmentConfig): Promise<void> {
    let mesh: THREE.Object3D;

    const cached = this.segmentCache.get(segment.file);
    if (cached) {
      mesh = cached.clone();
    } else {
      try {
        const gltf = await this.loader.loadAsync(segment.file);
        this.segmentCache.set(segment.file, gltf.scene.clone() as THREE.Group);
        mesh = gltf.scene;
      } catch (error) {
        console.warn(`[LazyRiver] Failed to load segment ${segment.id}`, error);
        mesh = this.createSegmentPlaceholder(segment);
      }
    }

    mesh.position.set(segment.position[0], segment.position[1], segment.position[2]);
    mesh.rotation.set(segment.rotation[0], segment.rotation[1], segment.rotation[2]);
    mesh.scale.set(segment.scale[0], segment.scale[1], segment.scale[2]);
    mesh.name = `river_${segment.id}`;
    mesh.userData = { isRiverSegment: true, segmentId: segment.id, segmentType: segment.type };

    this.segmentMeshes.set(segment.id, mesh);
    this.routeGroup.add(mesh);
  }

  private createSegmentPlaceholder(segment: RiverSegmentConfig): THREE.Object3D {
    const group = new THREE.Group();

    // Blue transparent box representing water
    const width = this.config.width;
    const geo = new THREE.BoxGeometry(width, 0.3, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2196f3,
      transparent: true,
      opacity: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    group.position.set(segment.position[0], segment.position[1], segment.position[2]);
    group.rotation.set(segment.rotation[0], segment.rotation[1], segment.rotation[2]);
    group.scale.set(segment.scale[0], segment.scale[1], segment.scale[2]);
    group.name = `river_placeholder_${segment.id}`;

    return group;
  }

  private drawDebugPath(): void {
    if (this.waypointPositions.length < 2) return;

    const points = [...this.waypointPositions];
    if (this.config.loop) {
      points.push(this.waypointPositions[0]); // Close the loop
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.5 });
    const line = new THREE.Line(geo, mat);
    line.name = 'river_debug_path';
    line.position.y = 0.5;
    this.routeGroup.add(line);
  }

  private findClosestWaypoint(point: Vec3): number {
    const target = new THREE.Vector3(point[0], point[1], point[2]);
    let closest = 0;
    let closestDist = Infinity;

    for (let i = 0; i < this.waypointPositions.length; i++) {
      const dist = this.waypointPositions[i].distanceTo(target);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    return closest;
  }

  private findClosestExit(position: THREE.Vector3): Vec3 {
    let closest = this.config.exitPoints[0];
    let closestDist = Infinity;

    for (const exit of this.config.exitPoints) {
      const dist = position.distanceTo(new THREE.Vector3(exit[0], exit[1], exit[2]));
      if (dist < closestDist) {
        closestDist = dist;
        closest = exit;
      }
    }
    return closest;
  }
}
