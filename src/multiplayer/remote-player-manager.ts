/**
 * OCC Live - Remote Player Manager (Part 3)
 * Creates, updates, and removes remote player avatars in the scene.
 * Handles position interpolation for smooth movement and animation
 * state synchronization including props (roasting stick, etc).
 */

import * as THREE from 'three';
import type { Vec3 } from '../types/index.ts';
import type { AvatarConfig } from '../types/avatar.ts';
import type { SyncPlayerState, InteractionSyncState, MultiplayerConfig } from '../types/multiplayer.ts';
import { AvatarAssembler } from '../avatar/avatar-assembler.ts';
import { AnimationStateMachine } from '../avatar/animation-state-machine.ts';
import type { PersonalSpaceSystem } from '../systems/personal-space.ts';

interface RemotePlayer {
  sessionId: string;
  mesh: THREE.Group;
  animStateMachine: AnimationStateMachine;
  targetPosition: THREE.Vector3;
  targetRotationY: number;
  currentPosition: THREE.Vector3;
  currentRotationY: number;
  animationState: string;
  interactionState: InteractionSyncState | null;
  avatarConfig: AvatarConfig;
  lastUpdate: number;
}

export class RemotePlayerManager {
  private scene: THREE.Scene;
  private assembler: AvatarAssembler;
  private players: Map<string, RemotePlayer> = new Map();
  private interpolationSpeed: number;
  private disconnectTimeoutMs: number;
  private personalSpaceSystem: PersonalSpaceSystem | null = null;

  constructor(scene: THREE.Scene, assembler: AvatarAssembler, config: MultiplayerConfig) {
    this.scene = scene;
    this.assembler = assembler;
    this.interpolationSpeed = config.interpolationSpeed;
    this.disconnectTimeoutMs = config.disconnectTimeoutMs;
  }

  /** Attach personal space system for position feeding */
  setPersonalSpaceSystem(system: PersonalSpaceSystem): void {
    this.personalSpaceSystem = system;
  }

  /** Add a new remote player to the scene */
  addPlayer(state: SyncPlayerState): void {
    if (this.players.has(state.sessionId)) return;

    const mesh = this.assembler.assemble(state.avatarConfig);
    mesh.name = `remote_${state.sessionId.slice(0, 8)}`;
    mesh.userData = { isRemotePlayer: true, sessionId: state.sessionId };

    const pos = new THREE.Vector3(state.position[0], state.position[1], state.position[2]);
    mesh.position.copy(pos);
    mesh.rotation.y = state.rotation[1];

    this.scene.add(mesh);

    const animSM = new AnimationStateMachine();
    animSM.attach(mesh);

    const player: RemotePlayer = {
      sessionId: state.sessionId,
      mesh,
      animStateMachine: animSM,
      targetPosition: pos.clone(),
      targetRotationY: state.rotation[1],
      currentPosition: pos.clone(),
      currentRotationY: state.rotation[1],
      animationState: state.animationState,
      interactionState: state.interactionState,
      avatarConfig: state.avatarConfig,
      lastUpdate: Date.now(),
    };

    this.players.set(state.sessionId, player);

    // Apply initial animation state
    this.applyAnimationState(player, state.animationState, state.interactionState);
  }

  /** Remove a remote player from the scene */
  removePlayer(sessionId: string): void {
    const player = this.players.get(sessionId);
    if (!player) return;

    player.animStateMachine.detach();
    this.scene.remove(player.mesh);
    this.players.delete(sessionId);

    // Remove from personal space tracking
    if (this.personalSpaceSystem) {
      this.personalSpaceSystem.removeRemoteAvatar(sessionId);
    }
  }

  /** Update a remote player's state */
  updatePlayerState(
    sessionId: string,
    position: Vec3,
    rotation: Vec3,
    animationState: string,
    interactionState: InteractionSyncState | null
  ): void {
    const player = this.players.get(sessionId);
    if (!player) return;

    player.targetPosition.set(position[0], position[1], position[2]);
    player.targetRotationY = rotation[1];
    player.lastUpdate = Date.now();

    // Update animation if changed
    if (animationState !== player.animationState || this.interactionChanged(player.interactionState, interactionState)) {
      this.applyAnimationState(player, animationState, interactionState);
      player.animationState = animationState;
      player.interactionState = interactionState;
    }
  }

  /** Sync from full world state (reconciliation) */
  syncWorldState(players: SyncPlayerState[]): void {
    const activeIds = new Set<string>();

    for (const state of players) {
      activeIds.add(state.sessionId);
      if (this.players.has(state.sessionId)) {
        this.updatePlayerState(
          state.sessionId,
          state.position,
          state.rotation,
          state.animationState,
          state.interactionState
        );
      } else {
        this.addPlayer(state);
      }
    }

    // Remove players not in the world state
    for (const [id] of this.players) {
      if (!activeIds.has(id)) {
        this.removePlayer(id);
      }
    }
  }

  /** Update interpolation and animations — call each frame */
  update(dt: number): void {
    const now = Date.now();

    for (const [id, player] of this.players) {
      // Remove stale players
      if (now - player.lastUpdate > this.disconnectTimeoutMs) {
        this.removePlayer(id);
        continue;
      }

      // Interpolate position
      const lerpFactor = 1 - Math.pow(1 - this.interpolationSpeed, dt * 60);
      player.currentPosition.lerp(player.targetPosition, lerpFactor);
      player.mesh.position.copy(player.currentPosition);

      // Feed position to personal space system
      if (this.personalSpaceSystem) {
        this.personalSpaceSystem.updateRemoteAvatar(id, player.currentPosition);
      }

      // Interpolate rotation (Y axis only)
      const rotDiff = player.targetRotationY - player.currentRotationY;
      // Handle wrapping
      let shortestAngle = ((rotDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (shortestAngle < -Math.PI) shortestAngle += Math.PI * 2;
      player.currentRotationY += shortestAngle * lerpFactor;
      player.mesh.rotation.y = player.currentRotationY;

      // Update animation state machine (with dummy movement state for procedural anims)
      const isWheelchair = player.avatarConfig.mobility === 'wheelchair';
      player.animStateMachine.update(dt, {
        isMoving: player.animationState === 'walk' || player.animationState === 'run' || player.animationState === 'roll' || player.animationState === 'roll_fast',
        isRunning: player.animationState === 'run' || player.animationState === 'roll_fast',
        isRolling: player.animationState === 'roll' || player.animationState === 'roll_fast' || (isWheelchair && (player.animationState === 'walk' || player.animationState === 'run')),
        isGrounded: player.animationState !== 'jump' && player.animationState !== 'fall',
        isJumping: player.animationState === 'jump',
        isFalling: player.animationState === 'fall',
        velocity: [0, 0, 0],
        speed: (player.animationState === 'run' || player.animationState === 'roll_fast') ? 8 : (player.animationState === 'walk' || player.animationState === 'roll') ? 4 : 0,
      });
    }
  }

  /** Get all remote player session IDs */
  getPlayerIds(): string[] {
    return Array.from(this.players.keys());
  }

  /** Get remote player count */
  getPlayerCount(): number {
    return this.players.size;
  }

  /** Remove all remote players */
  dispose(): void {
    for (const [id] of this.players) {
      this.removePlayer(id);
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private applyAnimationState(
    player: RemotePlayer,
    animState: string,
    interactionState: InteractionSyncState | null
  ): void {
    const sm = player.animStateMachine;

    // Handle social/interaction animations
    if (interactionState?.isActive) {
      const socialAnims = ['sit', 'dance', 'swing', 'float', 'play', 'drink', 'enter', 'roast_marshmallow'];
      if (socialAnims.includes(interactionState.interactionType)) {
        sm.playSocialAnimation(interactionState.interactionType as any);
        return;
      }
    }

    // Handle emotes
    const emotes = ['wave', 'dance', 'cheer', 'laugh', 'celebrate', 'point'];
    if (emotes.includes(animState)) {
      sm.playEmote(animState as any, 4.0);
      return;
    }

    // For standard movement states, let the update loop handle it via
    // the dummy movement state we pass in update()
    if (sm.isInSocialState() && !interactionState?.isActive) {
      sm.stopSocialAnimation();
    }
  }

  private interactionChanged(
    a: InteractionSyncState | null,
    b: InteractionSyncState | null
  ): boolean {
    if (a === null && b === null) return false;
    if (a === null || b === null) return true;
    return a.interactionType !== b.interactionType || a.isActive !== b.isActive;
  }
}
