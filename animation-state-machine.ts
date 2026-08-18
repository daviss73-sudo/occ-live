/**
 * OCC Live - Animation State Machine (Part 2)
 * Manages animation state transitions based on player movement.
 * Uses procedural animations on the placeholder avatar until
 * .glb animation clips are available from Meshy.
 * Provides hooks for future social animations (dance, sit, etc).
 */

import * as THREE from 'three';
import type {
  AnimationState,
  SocialAnimation,
  EmoteType,
  PlayerMovementState,
} from '../types/avatar.ts';

export type AnyAnimationState = AnimationState | SocialAnimation | EmoteType;

export class AnimationStateMachine {
  private currentState: AnyAnimationState = 'idle';
  private previousState: AnyAnimationState = 'idle';
  private stateTime: number = 0;
  private avatarGroup: THREE.Group | null = null;
  private emoteCallback: ((emote: EmoteType) => void) | null = null;
  private isPlayingEmote: boolean = false;
  private emoteTimer: number = 0;
  private emoteDuration: number = 2.0;

  // Procedural animation references
  private bodyRef: THREE.Object3D | null = null;
  private leftArmRef: THREE.Object3D | null = null;
  private rightArmRef: THREE.Object3D | null = null;
  private leftLegRef: THREE.Object3D | null = null;
  private rightLegRef: THREE.Object3D | null = null;

  // Props
  private roastingStickProp: THREE.Group | null = null;

  constructor() {}

  /** Attach to an avatar group for procedural animation */
  attach(avatarGroup: THREE.Group): void {
    this.avatarGroup = avatarGroup;
    this.findBones();
  }

  /** Detach from current avatar */
  detach(): void {
    this.avatarGroup = null;
    this.bodyRef = null;
    this.leftArmRef = null;
    this.rightArmRef = null;
    this.leftLegRef = null;
    this.rightLegRef = null;
  }

  /** Get current animation state */
  getState(): AnyAnimationState {
    return this.currentState;
  }

  /** Get previous state (for transition logic) */
  getPreviousState(): AnyAnimationState {
    return this.previousState;
  }

  /** Is an emote currently playing? */
  isEmotePlaying(): boolean {
    return this.isPlayingEmote;
  }

  /** Set callback for when emotes trigger */
  onEmote(callback: (emote: EmoteType) => void): void {
    this.emoteCallback = callback;
  }

  /** Update animation based on movement state — call each frame */
  update(dt: number, movementState: PlayerMovementState): void {
    this.stateTime += dt;

    // Emote takes priority
    if (this.isPlayingEmote) {
      this.emoteTimer -= dt;
      if (this.emoteTimer <= 0) {
        this.isPlayingEmote = false;
        this.transition('idle');
      } else {
        this.applyProceduralAnimation(dt);
        return;
      }
    }

    // Social states (sit, float, etc) persist until explicitly stopped
    if (this.isInSocialState()) {
      this.applyProceduralAnimation(dt);
      return;
    }

    // Determine target state from movement
    const targetState = this.resolveState(movementState);

    if (targetState !== this.currentState) {
      this.transition(targetState);
    }

    this.applyProceduralAnimation(dt);
  }

  /** Play an emote (overrides current state temporarily) */
  playEmote(emote: EmoteType, duration: number = 2.0): void {
    this.isPlayingEmote = true;
    this.emoteTimer = duration;
    this.emoteDuration = duration;
    this.transition(emote);
    if (this.emoteCallback) {
      this.emoteCallback(emote);
    }
  }

  /** Play a social animation (similar to emote but may loop) */
  playSocialAnimation(anim: SocialAnimation): void {
    this.transition(anim);
    // Attach props if needed
    if (anim === 'roast_marshmallow') {
      this.attachRoastingStick();
    }
  }

  /** Stop social animation and return to idle */
  stopSocialAnimation(): void {
    // Remove any active props
    this.detachRoastingStick();
    this.isPlayingEmote = false;
    this.transition('idle');
  }

  // ─── State Resolution ──────────────────────────────────────────────────

  private resolveState(ms: PlayerMovementState): AnimationState {
    if (ms.isJumping) return 'jump';
    if (ms.isFalling) return 'fall';
    if (!ms.isGrounded) return 'fall';
    if (ms.isRolling && ms.isRunning) return 'roll_fast';
    if (ms.isRolling) return 'roll';
    if (ms.isMoving && ms.isRunning) return 'run';
    if (ms.isMoving) return 'walk';
    return 'idle';
  }

  private transition(newState: AnyAnimationState): void {
    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateTime = 0;
  }

  // ─── Procedural Animation ──────────────────────────────────────────────

  private findBones(): void {
    if (!this.avatarGroup) return;

    const body = this.avatarGroup.getObjectByName('slot_body');
    if (body) {
      this.bodyRef = body;
      this.leftArmRef = body.getObjectByName('arm_left') ?? null;
      this.rightArmRef = body.getObjectByName('arm_right') ?? null;
    }

    const bottom = this.avatarGroup.getObjectByName('slot_bottom');
    if (bottom) {
      this.leftLegRef = bottom.getObjectByName('leg_left') ?? null;
      this.rightLegRef = bottom.getObjectByName('leg_right') ?? null;
    }
  }

  /** Check if an animation is implemented (has procedural or clip animation) */
  hasAnimation(state: AnyAnimationState): boolean {
    const implemented: AnyAnimationState[] = [
      'idle', 'walk', 'run', 'roll', 'roll_fast', 'jump', 'fall', 'land',
      'dance', 'wave', 'sit', 'roast_marshmallow',
    ];
    return implemented.includes(state);
  }

  /** Is the avatar currently in a sustained social state (sit, float, etc)? */
  isInSocialState(): boolean {
    const socialStates: AnyAnimationState[] = [
      'sit', 'dance', 'swing', 'float', 'play',
    ];
    return socialStates.includes(this.currentState);
  }

  private applyProceduralAnimation(dt: number): void {
    if (!this.avatarGroup) return;

    const t = this.stateTime;

    switch (this.currentState) {
      case 'idle':
        this.animateIdle(t);
        break;
      case 'walk':
        this.animateWalk(t, 3.0);
        break;
      case 'run':
        this.animateWalk(t, 6.0);
        break;
      case 'roll':
        this.animateRoll(t, 3.0);
        break;
      case 'roll_fast':
        this.animateRoll(t, 6.0);
        break;
      case 'jump':
        this.animateJump(t);
        break;
      case 'fall':
        this.animateFall(t);
        break;
      case 'dance':
        this.animateDance(t);
        break;
      case 'wave':
        this.animateWave(t);
        break;
      case 'sit':
        this.animateSit(t);
        break;
      case 'roast_marshmallow':
        this.animateRoastMarshmallow(t);
        break;
      // States with hooks but no animation yet — hold idle pose
      case 'drink':
      case 'swing':
      case 'float':
      case 'play':
        this.animateIdle(t);
        break;
      default:
        this.animateIdle(t);
    }
  }

  private animateIdle(t: number): void {
    // Gentle breathing bob
    if (this.bodyRef) {
      this.bodyRef.position.y = Math.sin(t * 1.5) * 0.01;
    }
    // Arms at rest
    if (this.leftArmRef) {
      this.leftArmRef.rotation.z = 0.15;
      this.leftArmRef.rotation.x = 0;
    }
    if (this.rightArmRef) {
      this.rightArmRef.rotation.z = -0.15;
      this.rightArmRef.rotation.x = 0;
    }
    // Legs straight
    if (this.leftLegRef) this.leftLegRef.rotation.x = 0;
    if (this.rightLegRef) this.rightLegRef.rotation.x = 0;
  }

  private animateWalk(t: number, speed: number): void {
    const swing = Math.sin(t * speed) * 0.3;

    // Arm swing (opposite to legs)
    if (this.leftArmRef) {
      this.leftArmRef.rotation.x = -swing;
      this.leftArmRef.rotation.z = 0.15;
    }
    if (this.rightArmRef) {
      this.rightArmRef.rotation.x = swing;
      this.rightArmRef.rotation.z = -0.15;
    }

    // Leg swing
    if (this.leftLegRef) {
      this.leftLegRef.rotation.x = swing;
    }
    if (this.rightLegRef) {
      this.rightLegRef.rotation.x = -swing;
    }

    // Body bob
    if (this.bodyRef) {
      this.bodyRef.position.y = Math.abs(Math.sin(t * speed * 2)) * 0.02;
    }
  }

  private animateJump(t: number): void {
    // Arms up
    if (this.leftArmRef) {
      this.leftArmRef.rotation.z = 0.8;
      this.leftArmRef.rotation.x = -0.3;
    }
    if (this.rightArmRef) {
      this.rightArmRef.rotation.z = -0.8;
      this.rightArmRef.rotation.x = -0.3;
    }
    // Legs tucked slightly
    if (this.leftLegRef) this.leftLegRef.rotation.x = -0.2;
    if (this.rightLegRef) this.rightLegRef.rotation.x = -0.2;
  }

  private animateFall(t: number): void {
    // Arms out for balance
    if (this.leftArmRef) {
      this.leftArmRef.rotation.z = 1.0;
      this.leftArmRef.rotation.x = 0;
    }
    if (this.rightArmRef) {
      this.rightArmRef.rotation.z = -1.0;
      this.rightArmRef.rotation.x = 0;
    }
    if (this.leftLegRef) this.leftLegRef.rotation.x = 0.1;
    if (this.rightLegRef) this.rightLegRef.rotation.x = -0.1;
  }

  private animateDance(t: number): void {
    const beat = Math.sin(t * 4) * 0.4;

    // Funky arm movement
    if (this.leftArmRef) {
      this.leftArmRef.rotation.z = 0.5 + Math.sin(t * 4) * 0.5;
      this.leftArmRef.rotation.x = Math.cos(t * 2) * 0.5;
    }
    if (this.rightArmRef) {
      this.rightArmRef.rotation.z = -0.5 - Math.sin(t * 4 + 1) * 0.5;
      this.rightArmRef.rotation.x = Math.cos(t * 2 + 1) * 0.5;
    }

    // Hip sway via legs
    if (this.leftLegRef) this.leftLegRef.rotation.x = beat * 0.3;
    if (this.rightLegRef) this.rightLegRef.rotation.x = -beat * 0.3;

    // Body bounce
    if (this.bodyRef) {
      this.bodyRef.position.y = Math.abs(Math.sin(t * 4)) * 0.05;
    }
  }

  private animateWave(t: number): void {
    // Right arm waves
    if (this.rightArmRef) {
      this.rightArmRef.rotation.z = -1.2;
      this.rightArmRef.rotation.x = Math.sin(t * 6) * 0.3;
    }
    // Left arm rests
    if (this.leftArmRef) {
      this.leftArmRef.rotation.z = 0.15;
      this.leftArmRef.rotation.x = 0;
    }
    // Legs idle
    if (this.leftLegRef) this.leftLegRef.rotation.x = 0;
    if (this.rightLegRef) this.rightLegRef.rotation.x = 0;
  }

  private animateRoll(t: number, speed: number): void {
    // Wheelchair rolling animation: arms push wheels in a rhythmic motion
    const pushCycle = Math.sin(t * speed) * 0.4;

    // Arms push forward and back (simulating wheel-push motion)
    if (this.leftArmRef) {
      this.leftArmRef.rotation.x = pushCycle;
      this.leftArmRef.rotation.z = 0.3; // Arms angled out to reach wheels
    }
    if (this.rightArmRef) {
      this.rightArmRef.rotation.x = pushCycle;
      this.rightArmRef.rotation.z = -0.3;
    }

    // Legs remain stationary (seated in wheelchair)
    if (this.leftLegRef) this.leftLegRef.rotation.x = -0.8;
    if (this.rightLegRef) this.rightLegRef.rotation.x = -0.8;

    // Subtle body lean forward during push phase
    if (this.bodyRef) {
      this.bodyRef.position.y = -0.15 + Math.sin(t * speed) * 0.02;
    }
  }

  private animateSit(t: number): void {
    // Legs bent forward (seated)
    if (this.leftLegRef) {
      this.leftLegRef.rotation.x = -1.4;
      this.leftLegRef.position.y = 0.25;
    }
    if (this.rightLegRef) {
      this.rightLegRef.rotation.x = -1.4;
      this.rightLegRef.position.y = 0.25;
    }
    // Body lowered
    if (this.bodyRef) {
      this.bodyRef.position.y = -0.35;
    }
    // Arms resting on lap
    if (this.leftArmRef) {
      this.leftArmRef.rotation.z = 0.3;
      this.leftArmRef.rotation.x = -0.8;
    }
    if (this.rightArmRef) {
      this.rightArmRef.rotation.z = -0.3;
      this.rightArmRef.rotation.x = -0.8;
    }
  }

  private animateRoastMarshmallow(t: number): void {
    // Seated base (like sit, but slightly different posture for roasting)
    if (this.leftLegRef) {
      this.leftLegRef.rotation.x = -1.3;
      this.leftLegRef.position.y = 0.25;
    }
    if (this.rightLegRef) {
      this.rightLegRef.rotation.x = -1.3;
      this.rightLegRef.position.y = 0.25;
    }
    // Body lowered and leaning slightly forward
    if (this.bodyRef) {
      this.bodyRef.position.y = -0.32;
    }

    // Both arms extended forward, holding the roasting stick
    // Left hand grips lower on the stick, right hand higher
    if (this.leftArmRef) {
      this.leftArmRef.rotation.z = 0.1;
      this.leftArmRef.rotation.x = -1.1;
    }
    if (this.rightArmRef) {
      this.rightArmRef.rotation.z = -0.1;
      this.rightArmRef.rotation.x = -1.0;
    }

    // Subtle idle movement — gentle sway as if adjusting the marshmallow
    if (this.roastingStickProp) {
      this.roastingStickProp.rotation.z = Math.sin(t * 0.8) * 0.03;
      this.roastingStickProp.rotation.x = Math.sin(t * 0.5) * 0.02;
    }
  }

  // ─── Prop Management ───────────────────────────────────────────────────

  private attachRoastingStick(): void {
    if (!this.avatarGroup || this.roastingStickProp) return;

    this.roastingStickProp = this.createRoastingStickProp();
    this.roastingStickProp.name = 'prop_roasting_stick';
    // Position relative to avatar: forward and slightly down (between hands)
    this.roastingStickProp.position.set(0, 0.85, -0.5);
    this.roastingStickProp.rotation.x = -0.6;
    this.avatarGroup.add(this.roastingStickProp);
  }

  private detachRoastingStick(): void {
    if (!this.avatarGroup || !this.roastingStickProp) return;
    this.avatarGroup.remove(this.roastingStickProp);
    this.roastingStickProp = null;

    // Reset leg positions that sit/roast modified
    if (this.leftLegRef) {
      this.leftLegRef.position.y = 0;
    }
    if (this.rightLegRef) {
      this.rightLegRef.position.y = 0;
    }
  }

  /**
   * Creates a placeholder roasting stick with marshmallow.
   * Will be replaced by Meshy .glb prop asset later.
   */
  private createRoastingStickProp(): THREE.Group {
    const group = new THREE.Group();
    group.userData = { isProp: true, propId: 'roasting_stick' };

    // Stick (thin brown cylinder)
    const stickGeo = new THREE.CylinderGeometry(0.015, 0.012, 0.8, 6);
    const stickMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.9,
    });
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.rotation.x = Math.PI / 2;
    stick.position.z = -0.3;
    stick.name = 'stick';
    group.add(stick);

    // Marshmallow (small white/golden cylinder at the end)
    const marshmallowGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8);
    const marshmallowMat = new THREE.MeshStandardMaterial({
      color: 0xfff8dc, // creamy white
      roughness: 0.3,
    });
    const marshmallow = new THREE.Mesh(marshmallowGeo, marshmallowMat);
    marshmallow.position.z = -0.7;
    marshmallow.rotation.x = Math.PI / 2;
    marshmallow.name = 'marshmallow';
    group.add(marshmallow);

    return group;
  }
}
