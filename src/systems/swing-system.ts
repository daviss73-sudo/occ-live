/**
 * OCC Live - Swing System (Part 6)
 * Interactive swing activity where players sit on swings and swing back
 * and forth. Only one player per swing (enforced). State synced to
 * other clients via multiplayer.
 *
 * Design:
 * - [E] to use swing when nearby
 * - Avatar sits on swing, procedural swing animation
 * - Single-occupancy enforcement per swing
 * - [E] or movement to exit
 * - Other players see the swinging avatar
 * - Multiple swings available in the swing zone
 */

import * as THREE from 'three';
import type { Vec3 } from '../types/index.ts';

// ─── Configuration ───────────────────────────────────────────────────────────

export interface SwingConfig {
  id: string;
  position: Vec3;
  rotation: Vec3;
  /** Seat height from ground */
  seatHeight: number;
  /** Swing amplitude (radians) */
  amplitude: number;
  /** Swing speed (oscillations per second) */
  speed: number;
  /** Chain/rope length */
  chainLength: number;
}

export interface SwingSystemConfig {
  swings: SwingConfig[];
  /** Position of the swing zone center */
  zoneCenter: Vec3;
  /** Radius for the swing zone */
  zoneRadius: number;
}

// ─── Swing State ─────────────────────────────────────────────────────────────

interface ActiveSwing {
  config: SwingConfig;
  mesh: THREE.Group;
  occupant: string | null;        // sessionId of player on the swing
  swingAngle: number;             // Current angle in radians
  swingDirection: number;         // 1 or -1
  isSwinging: boolean;
  seatPosition: THREE.Vector3;    // World position of the seat
}

// ─── Swing Sync State (multiplayer) ──────────────────────────────────────────

export interface SwingSyncState {
  swingId: string;
  occupant: string | null;
  swingAngle: number;
  isSwinging: boolean;
}

// ─── Swing System ────────────────────────────────────────────────────────────

export class SwingSystem {
  private scene: THREE.Scene;
  private config: SwingSystemConfig;
  private swings: Map<string, ActiveSwing> = new Map();
  private swingGroup: THREE.Group;
  private onSwingStateChange: ((state: SwingSyncState) => void) | null = null;

  constructor(scene: THREE.Scene, config: SwingSystemConfig) {
    this.scene = scene;
    this.config = config;
    this.swingGroup = new THREE.Group();
    this.swingGroup.name = 'swing_set';
    this.scene.add(this.swingGroup);

    this.initialize();
  }

  // ─── Initialization ────────────────────────────────────────────────────

  private initialize(): void {
    for (const swingConfig of this.config.swings) {
      const mesh = this.createSwingMesh(swingConfig);
      const seatPos = new THREE.Vector3(
        swingConfig.position[0],
        swingConfig.seatHeight,
        swingConfig.position[2]
      );

      this.swings.set(swingConfig.id, {
        config: swingConfig,
        mesh,
        occupant: null,
        swingAngle: 0,
        swingDirection: 1,
        isSwinging: false,
        seatPosition: seatPos,
      });

      this.swingGroup.add(mesh);
    }
  }

  // ─── Player Interaction ────────────────────────────────────────────────

  /**
   * Attempt to sit on a swing. Returns the swing ID if successful, null if all occupied.
   */
  sitOnSwing(sessionId: string, preferredSwingId?: string): string | null {
    // Try preferred swing first
    if (preferredSwingId) {
      const swing = this.swings.get(preferredSwingId);
      if (swing && !swing.occupant) {
        return this.occupySwing(swing, sessionId);
      }
    }

    // Find first available swing
    for (const [id, swing] of this.swings) {
      if (!swing.occupant) {
        return this.occupySwing(swing, sessionId);
      }
    }

    return null; // All swings occupied
  }

  /** Get off a swing */
  exitSwing(sessionId: string): Vec3 | null {
    for (const swing of this.swings.values()) {
      if (swing.occupant === sessionId) {
        swing.occupant = null;
        swing.isSwinging = false;

        // Return exit position (slightly in front of the swing)
        const exitPos: Vec3 = [
          swing.config.position[0],
          0,
          swing.config.position[2] + 1.5,
        ];

        this.notifyStateChange(swing);
        return exitPos;
      }
    }
    return null;
  }

  /** Check if a player is on any swing */
  isPlayerOnSwing(sessionId: string): boolean {
    for (const swing of this.swings.values()) {
      if (swing.occupant === sessionId) return true;
    }
    return false;
  }

  /** Get the swing a player is on */
  getPlayerSwing(sessionId: string): string | null {
    for (const [id, swing] of this.swings) {
      if (swing.occupant === sessionId) return id;
    }
    return null;
  }

  /** Check if a specific swing is available */
  isSwingAvailable(swingId: string): boolean {
    const swing = this.swings.get(swingId);
    return swing !== null && swing !== undefined && swing.occupant === null;
  }

  /** Get the nearest available swing to a position */
  getNearestAvailableSwing(position: THREE.Vector3): string | null {
    let nearest: string | null = null;
    let nearestDist = Infinity;

    for (const [id, swing] of this.swings) {
      if (swing.occupant) continue;
      const dist = position.distanceTo(swing.seatPosition);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = id;
      }
    }

    return nearest;
  }

  // ─── Update Loop ───────────────────────────────────────────────────────

  /** Update swing animations — call each frame */
  update(dt: number): void {
    for (const swing of this.swings.values()) {
      if (swing.occupant && swing.isSwinging) {
        // Pendulum motion
        const time = performance.now() * 0.001;
        const angle = Math.sin(time * swing.config.speed * Math.PI * 2) * swing.config.amplitude;
        swing.swingAngle = angle;

        // Rotate the swing seat around the top pivot
        const seatGroup = swing.mesh.getObjectByName('swing_seat_group');
        if (seatGroup) {
          seatGroup.rotation.x = angle;
        }
      }
    }
  }

  // ─── Multiplayer Sync ──────────────────────────────────────────────────

  /** Set callback for state changes (for network sync) */
  setOnStateChange(callback: (state: SwingSyncState) => void): void {
    this.onSwingStateChange = callback;
  }

  /** Apply sync state from remote (for remote players) */
  applySyncState(state: SwingSyncState): void {
    const swing = this.swings.get(state.swingId);
    if (!swing) return;

    swing.occupant = state.occupant;
    swing.isSwinging = state.isSwinging;
    swing.swingAngle = state.swingAngle;
  }

  /** Get all sync states (for world state reconciliation) */
  getAllSyncStates(): SwingSyncState[] {
    const states: SwingSyncState[] = [];
    for (const [, swing] of this.swings) {
      states.push({
        swingId: swing.config.id,
        occupant: swing.occupant,
        swingAngle: swing.swingAngle,
        isSwinging: swing.isSwinging,
      });
    }
    return states;
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get the seat position of a swing (for positioning the avatar) */
  getSeatPosition(swingId: string): THREE.Vector3 | null {
    const swing = this.swings.get(swingId);
    if (!swing) return null;
    return swing.seatPosition.clone();
  }

  /** Get the number of available swings */
  getAvailableCount(): number {
    let count = 0;
    for (const swing of this.swings.values()) {
      if (!swing.occupant) count++;
    }
    return count;
  }

  /** Get the total number of swings */
  getTotalCount(): number {
    return this.swings.size;
  }

  /** Clean up */
  dispose(): void {
    this.scene.remove(this.swingGroup);
    this.swings.clear();
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private occupySwing(swing: ActiveSwing, sessionId: string): string {
    swing.occupant = sessionId;
    swing.isSwinging = true;
    this.notifyStateChange(swing);
    return swing.config.id;
  }

  private notifyStateChange(swing: ActiveSwing): void {
    if (this.onSwingStateChange) {
      this.onSwingStateChange({
        swingId: swing.config.id,
        occupant: swing.occupant,
        swingAngle: swing.swingAngle,
        isSwinging: swing.isSwinging,
      });
    }
  }

  private createSwingMesh(config: SwingConfig): THREE.Group {
    const group = new THREE.Group();
    group.name = `swing_${config.id}`;
    group.position.set(config.position[0], config.position[1], config.position[2]);
    group.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);

    // Top beam (A-frame cross bar)
    const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = config.chainLength + config.seatHeight + 0.5;
    beam.rotation.z = Math.PI / 2;
    beam.name = 'swing_beam';
    group.add(beam);

    // Seat group (this is what rotates for swing animation)
    const seatGroup = new THREE.Group();
    seatGroup.name = 'swing_seat_group';
    seatGroup.position.y = config.chainLength + config.seatHeight + 0.5;

    // Chains/ropes
    const chainGeo = new THREE.CylinderGeometry(0.015, 0.015, config.chainLength, 4);
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.7 });

    const leftChain = new THREE.Mesh(chainGeo, chainMat);
    leftChain.position.set(-0.2, -config.chainLength / 2, 0);
    seatGroup.add(leftChain);

    const rightChain = new THREE.Mesh(chainGeo, chainMat);
    rightChain.position.set(0.2, -config.chainLength / 2, 0);
    seatGroup.add(rightChain);

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.5, 0.04, 0.3);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.7 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.y = -config.chainLength;
    seat.name = 'swing_seat';
    seatGroup.add(seat);

    group.add(seatGroup);

    return group;
  }
}
