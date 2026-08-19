/**
 * OCC Live - Ball Pit System (Part 6)
 * Interactive ball pit activity where players can enter, move around,
 * and play. Balls react to player movement with physics-lite behavior.
 *
 * Design:
 * - Players enter via [E] interaction prompt
 * - Movement within the pit displaces nearby balls
 * - Balls settle back over time (simple spring physics)
 * - No scoring or competition — purely playful
 * - Multiple players can be in the pit simultaneously
 * - Multiplayer: other players see ball displacement
 * - Exit via [E] or walking to edge
 */

import * as THREE from 'three';
import type { Vec3 } from '../types/index.ts';

// ─── Configuration ───────────────────────────────────────────────────────────

export interface BallPitConfig {
  /** Center position of the ball pit */
  position: Vec3;
  /** Radius of the pit */
  radius: number;
  /** Depth of the pit (how far down balls go) */
  depth: number;
  /** Number of balls to simulate */
  ballCount: number;
  /** Minimum ball radius */
  ballRadiusMin: number;
  /** Maximum ball radius */
  ballRadiusMax: number;
  /** How strongly balls are pushed by players */
  pushStrength: number;
  /** How quickly balls settle back (0-1, lower = slower) */
  settleSpeed: number;
  /** Ball color palette */
  colors: number[];
  /** Entry/exit position */
  entryPosition: Vec3;
  /** Exit position */
  exitPosition: Vec3;
}

const DEFAULT_CONFIG: BallPitConfig = {
  position: [25, 0, -10],
  radius: 6,
  depth: 1.2,
  ballCount: 80,
  ballRadiusMin: 0.15,
  ballRadiusMax: 0.3,
  pushStrength: 3.0,
  settleSpeed: 0.02,
  colors: [0xff4444, 0x44aaff, 0xffdd44, 0x44ff88, 0xff88ff, 0xff8844, 0x8844ff],
  entryPosition: [25, 0, -7],
  exitPosition: [25, 0, -7],
};

// ─── Ball Instance ───────────────────────────────────────────────────────────

interface Ball {
  mesh: THREE.Mesh;
  restPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
}

// ─── Ball Pit System ─────────────────────────────────────────────────────────

export class BallPitSystem {
  private scene: THREE.Scene;
  private config: BallPitConfig;
  private balls: Ball[] = [];
  private pitGroup: THREE.Group;
  private playersInPit: Set<string> = new Set();
  private playerPositions: Map<string, THREE.Vector3> = new Map();
  private pitCenter: THREE.Vector3;
  private isInitialized: boolean = false;

  constructor(scene: THREE.Scene, config?: Partial<BallPitConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pitCenter = new THREE.Vector3(
      this.config.position[0],
      this.config.position[1],
      this.config.position[2]
    );
    this.pitGroup = new THREE.Group();
    this.pitGroup.name = 'ball_pit';
    this.scene.add(this.pitGroup);
  }

  // ─── Initialization ────────────────────────────────────────────────────

  /** Initialize the ball pit with balls */
  initialize(): void {
    if (this.isInitialized) return;

    this.createPitBase();
    this.createBalls();
    this.isInitialized = true;
  }

  // ─── Player Entry/Exit ─────────────────────────────────────────────────

  /** Player enters the ball pit */
  enterPit(sessionId: string): void {
    this.playersInPit.add(sessionId);
    this.playerPositions.set(sessionId, this.pitCenter.clone());
  }

  /** Player exits the ball pit */
  exitPit(sessionId: string): void {
    this.playersInPit.delete(sessionId);
    this.playerPositions.delete(sessionId);
  }

  /** Is a player currently in the pit? */
  isInPit(sessionId: string): boolean {
    return this.playersInPit.has(sessionId);
  }

  /** Get all players currently in the pit */
  getPlayersInPit(): string[] {
    return Array.from(this.playersInPit);
  }

  /** Get the player count in the pit */
  getPlayerCount(): number {
    return this.playersInPit.size;
  }

  // ─── Update Loop ───────────────────────────────────────────────────────

  /**
   * Update the player's position within the pit (for ball displacement).
   * Call each frame for players inside the pit.
   */
  updatePlayerPosition(sessionId: string, position: THREE.Vector3): void {
    if (!this.playersInPit.has(sessionId)) return;
    this.playerPositions.set(sessionId, position.clone());
  }

  /** Update ball physics — call each frame */
  update(dt: number): void {
    if (!this.isInitialized) return;

    for (const ball of this.balls) {
      // Apply push from all players in the pit
      for (const playerPos of this.playerPositions.values()) {
        const toBall = ball.mesh.position.clone().sub(playerPos);
        toBall.y = 0; // Only horizontal displacement
        const dist = toBall.length();
        const pushRadius = 1.5; // How close player needs to be to push balls

        if (dist < pushRadius && dist > 0.01) {
          const force = (1 - dist / pushRadius) * this.config.pushStrength;
          toBall.normalize();
          ball.velocity.x += toBall.x * force * dt;
          ball.velocity.z += toBall.z * force * dt;
          // Small upward pop
          ball.velocity.y += force * 0.3 * dt;
        }
      }

      // Apply velocity
      ball.mesh.position.x += ball.velocity.x * dt;
      ball.mesh.position.y += ball.velocity.y * dt;
      ball.mesh.position.z += ball.velocity.z * dt;

      // Gravity (settle back down)
      if (ball.mesh.position.y > ball.restPosition.y) {
        ball.velocity.y -= 9.8 * dt;
      }

      // Floor collision
      if (ball.mesh.position.y < ball.restPosition.y) {
        ball.mesh.position.y = ball.restPosition.y;
        ball.velocity.y *= -0.3; // Bounce with damping
      }

      // Settle back to rest position (horizontal spring)
      const toRest = ball.restPosition.clone().sub(ball.mesh.position);
      toRest.y = 0;
      ball.velocity.x += toRest.x * this.config.settleSpeed;
      ball.velocity.z += toRest.z * this.config.settleSpeed;

      // Damping
      ball.velocity.x *= 0.95;
      ball.velocity.z *= 0.95;

      // Keep balls within pit radius
      const fromCenter = ball.mesh.position.clone().sub(this.pitCenter);
      fromCenter.y = 0;
      if (fromCenter.length() > this.config.radius * 0.9) {
        fromCenter.normalize();
        ball.mesh.position.x = this.pitCenter.x + fromCenter.x * this.config.radius * 0.9;
        ball.mesh.position.z = this.pitCenter.z + fromCenter.z * this.config.radius * 0.9;
        ball.velocity.x *= -0.5;
        ball.velocity.z *= -0.5;
      }
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Check if a world position is within the pit area */
  isPositionInPit(position: THREE.Vector3): boolean {
    const dist = position.distanceTo(this.pitCenter);
    return dist <= this.config.radius;
  }

  /** Get the entry position */
  getEntryPosition(): Vec3 {
    return this.config.entryPosition;
  }

  /** Get the exit position */
  getExitPosition(): Vec3 {
    return this.config.exitPosition;
  }

  /** Get the pit center */
  getCenter(): THREE.Vector3 {
    return this.pitCenter.clone();
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  /** Remove all balls and clean up */
  dispose(): void {
    this.scene.remove(this.pitGroup);
    this.balls = [];
    this.playersInPit.clear();
    this.playerPositions.clear();
  }

  // ─── Private: Creation ─────────────────────────────────────────────────

  private createPitBase(): void {
    // Circular pit floor (slightly below ground level)
    const floorGeo = new THREE.CircleGeometry(this.config.radius, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a3e,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(
      this.config.position[0],
      this.config.position[1] - this.config.depth,
      this.config.position[2]
    );
    floor.receiveShadow = true;
    floor.name = 'ball_pit_floor';
    this.pitGroup.add(floor);

    // Pit wall (ring)
    const wallGeo = new THREE.CylinderGeometry(
      this.config.radius, this.config.radius, this.config.depth, 32, 1, true
    );
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x3d2a5e,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(
      this.config.position[0],
      this.config.position[1] - this.config.depth / 2,
      this.config.position[2]
    );
    wall.name = 'ball_pit_wall';
    this.pitGroup.add(wall);
  }

  private createBalls(): void {
    const { ballCount, ballRadiusMin, ballRadiusMax, colors, radius, position, depth } = this.config;

    for (let i = 0; i < ballCount; i++) {
      // Random position within pit
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.85;
      const ballRadius = ballRadiusMin + Math.random() * (ballRadiusMax - ballRadiusMin);

      const x = position[0] + Math.cos(angle) * dist;
      const z = position[2] + Math.sin(angle) * dist;
      const y = position[1] - depth + ballRadius + Math.random() * (depth * 0.6);

      // Create ball mesh
      const geo = new THREE.SphereGeometry(ballRadius, 8, 8);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.name = `ball_${i}`;
      this.pitGroup.add(mesh);

      this.balls.push({
        mesh,
        restPosition: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(),
        radius: ballRadius,
      });
    }
  }
}
