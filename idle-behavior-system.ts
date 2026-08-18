/**
 * OCC Live - Idle Behavior System (Part 6)
 * Prevents avatars from appearing frozen when sitting or stationary
 * for extended periods. Applies subtle procedural micro-animations
 * to seated/idle avatars.
 *
 * Behaviors:
 * - Subtle head look-around (randomized direction, slow)
 * - Small body breathing motion (vertical oscillation)
 * - Relaxed posture shifts (periodic weight shift)
 * - Occasional small gestures
 *
 * Design:
 * - Non-intrusive: animations are subtle, not distracting
 * - Per-avatar: each avatar gets independent randomized timing
 * - Works with both local and remote avatars
 * - Does not interfere with active interactions (roasting, swinging)
 */

import * as THREE from 'three';

// ─── Idle Behavior Configuration ─────────────────────────────────────────────

export interface IdleBehaviorConfig {
  /** Enable/disable the system */
  enabled: boolean;
  /** Time in seconds before idle behavior activates after stopping */
  activationDelay: number;
  /** Head look-around speed (radians per second) */
  headTurnSpeed: number;
  /** Maximum head turn angle (radians) */
  maxHeadTurn: number;
  /** Breathing amplitude (world units) */
  breathingAmplitude: number;
  /** Breathing speed (cycles per second) */
  breathingSpeed: number;
  /** How often to change look direction (seconds) */
  lookChangeInterval: number;
  /** Posture shift amplitude */
  postureShiftAmplitude: number;
  /** Posture shift frequency (shifts per minute) */
  postureShiftFrequency: number;
}

const DEFAULT_CONFIG: IdleBehaviorConfig = {
  enabled: true,
  activationDelay: 3.0,
  headTurnSpeed: 0.3,
  maxHeadTurn: 0.4,
  breathingAmplitude: 0.008,
  breathingSpeed: 0.25,
  lookChangeInterval: 4.0,
  postureShiftAmplitude: 0.015,
  postureShiftFrequency: 3, // shifts per minute
};

// ─── Tracked Avatar State ────────────────────────────────────────────────────

interface IdleAvatarState {
  sessionId: string;
  mesh: THREE.Group;
  /** Time spent idle (seconds) */
  idleTime: number;
  /** Whether idle behaviors are active */
  isActive: boolean;
  /** Is the avatar currently in an interaction that should suppress idle */
  isSuppressed: boolean;
  /** Randomized phase offsets for variation between avatars */
  phaseOffset: number;
  /** Current target head rotation */
  targetHeadY: number;
  /** Current head rotation */
  currentHeadY: number;
  /** Timer for next look direction change */
  lookTimer: number;
  /** Timer for posture shift */
  postureTimer: number;
  /** Current posture offset */
  postureOffset: number;
  /** Reference to head bone/object (if found) */
  headRef: THREE.Object3D | null;
  /** Original head rotation */
  originalHeadRotY: number;
}

// ─── Idle Behavior System ────────────────────────────────────────────────────

export class IdleBehaviorSystem {
  private config: IdleBehaviorConfig;
  private avatars: Map<string, IdleAvatarState> = new Map();

  constructor(config?: Partial<IdleBehaviorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Avatar Registration ───────────────────────────────────────────────

  /** Register an avatar for idle behavior tracking */
  registerAvatar(sessionId: string, mesh: THREE.Group): void {
    const headRef = this.findHead(mesh);

    this.avatars.set(sessionId, {
      sessionId,
      mesh,
      idleTime: 0,
      isActive: false,
      isSuppressed: false,
      phaseOffset: Math.random() * Math.PI * 2,
      targetHeadY: 0,
      currentHeadY: 0,
      lookTimer: Math.random() * this.config.lookChangeInterval,
      postureTimer: Math.random() * 20,
      postureOffset: 0,
      headRef,
      originalHeadRotY: headRef?.rotation.y ?? 0,
    });
  }

  /** Unregister an avatar */
  unregisterAvatar(sessionId: string): void {
    // Restore original state before removing
    const state = this.avatars.get(sessionId);
    if (state && state.headRef) {
      state.headRef.rotation.y = state.originalHeadRotY;
    }
    this.avatars.delete(sessionId);
  }

  /** Update the mesh reference for an avatar (e.g. after GLB load) */
  updateMesh(sessionId: string, mesh: THREE.Group): void {
    const state = this.avatars.get(sessionId);
    if (state) {
      state.mesh = mesh;
      state.headRef = this.findHead(mesh);
      state.originalHeadRotY = state.headRef?.rotation.y ?? 0;
    }
  }

  // ─── State Control ─────────────────────────────────────────────────────

  /**
   * Notify the system that an avatar has started moving.
   * Resets idle timer and deactivates behaviors.
   */
  notifyMoving(sessionId: string): void {
    const state = this.avatars.get(sessionId);
    if (state) {
      state.idleTime = 0;
      if (state.isActive) {
        this.deactivate(state);
      }
    }
  }

  /**
   * Notify the system that an avatar is in an active interaction
   * (roasting marshmallow, swinging, etc.) that should suppress idle.
   */
  suppressIdle(sessionId: string, suppress: boolean): void {
    const state = this.avatars.get(sessionId);
    if (state) {
      state.isSuppressed = suppress;
      if (suppress && state.isActive) {
        this.deactivate(state);
      }
    }
  }

  // ─── Update Loop ───────────────────────────────────────────────────────

  /** Update all tracked avatars — call each frame */
  update(dt: number): void {
    if (!this.config.enabled) return;

    for (const state of this.avatars.values()) {
      if (state.isSuppressed) continue;

      // Accumulate idle time
      state.idleTime += dt;

      // Activate after delay
      if (!state.isActive && state.idleTime >= this.config.activationDelay) {
        state.isActive = true;
      }

      // Apply idle behaviors
      if (state.isActive) {
        this.applyBreathing(state, dt);
        this.applyLookAround(state, dt);
        this.applyPostureShift(state, dt);
      }
    }
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  /** Update the configuration at runtime */
  setConfig(config: Partial<IdleBehaviorConfig>): void {
    Object.assign(this.config, config);
  }

  /** Get current config */
  getConfig(): IdleBehaviorConfig {
    return { ...this.config };
  }

  /** Enable/disable the system */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      for (const state of this.avatars.values()) {
        this.deactivate(state);
      }
    }
  }

  // ─── Debug ─────────────────────────────────────────────────────────────

  /** Get the number of actively idle avatars */
  getActiveCount(): number {
    let count = 0;
    for (const state of this.avatars.values()) {
      if (state.isActive) count++;
    }
    return count;
  }

  /** Get the total number of tracked avatars */
  getTrackedCount(): number {
    return this.avatars.size;
  }

  // ─── Private: Animation Application ────────────────────────────────────

  private applyBreathing(state: IdleAvatarState, _dt: number): void {
    const time = performance.now() * 0.001;
    const phase = time * this.config.breathingSpeed * Math.PI * 2 + state.phaseOffset;
    const breathOffset = Math.sin(phase) * this.config.breathingAmplitude;

    // Apply vertical oscillation to the mesh
    // Store the base Y and offset it — avoid accumulating drift
    const baseY = state.mesh.userData.__idleBaseY ?? state.mesh.position.y;
    if (state.mesh.userData.__idleBaseY === undefined) {
      state.mesh.userData.__idleBaseY = state.mesh.position.y;
    }
    state.mesh.position.y = baseY + breathOffset;
  }

  private applyLookAround(state: IdleAvatarState, dt: number): void {
    if (!state.headRef) return;

    // Update look timer
    state.lookTimer -= dt;
    if (state.lookTimer <= 0) {
      // Pick a new random look direction
      state.targetHeadY = (Math.random() - 0.5) * 2 * this.config.maxHeadTurn;
      state.lookTimer = this.config.lookChangeInterval * (0.7 + Math.random() * 0.6);
    }

    // Smoothly rotate head toward target
    const diff = state.targetHeadY - state.currentHeadY;
    state.currentHeadY += diff * this.config.headTurnSpeed * dt * 5;

    state.headRef.rotation.y = state.originalHeadRotY + state.currentHeadY;
  }

  private applyPostureShift(state: IdleAvatarState, dt: number): void {
    state.postureTimer -= dt;
    if (state.postureTimer <= 0) {
      // Pick a small random lean
      state.postureOffset = (Math.random() - 0.5) * this.config.postureShiftAmplitude;
      state.postureTimer = 60 / this.config.postureShiftFrequency * (0.7 + Math.random() * 0.6);
    }

    // Apply subtle lean
    const currentLean = state.mesh.rotation.z;
    const targetLean = state.postureOffset;
    state.mesh.rotation.z = currentLean + (targetLean - currentLean) * dt * 0.5;
  }

  private deactivate(state: IdleAvatarState): void {
    state.isActive = false;

    // Restore original positions
    if (state.mesh.userData.__idleBaseY !== undefined) {
      state.mesh.position.y = state.mesh.userData.__idleBaseY;
      delete state.mesh.userData.__idleBaseY;
    }
    state.mesh.rotation.z = 0;

    if (state.headRef) {
      state.headRef.rotation.y = state.originalHeadRotY;
    }

    state.currentHeadY = 0;
    state.postureOffset = 0;
  }

  // ─── Private: Mesh Inspection ──────────────────────────────────────────

  private findHead(mesh: THREE.Group): THREE.Object3D | null {
    // Try to find a head object in the avatar hierarchy
    const headNames = ['head', 'Head', 'slot_head', 'avatar_head'];
    for (const name of headNames) {
      const found = mesh.getObjectByName(name);
      if (found) return found;
    }

    // Fallback: find the highest positioned child object
    let highest: THREE.Object3D | null = null;
    let highestY = -Infinity;
    mesh.traverse((child) => {
      if (child.position.y > highestY && child !== mesh) {
        highestY = child.position.y;
        highest = child;
      }
    });

    return highest;
  }
}
