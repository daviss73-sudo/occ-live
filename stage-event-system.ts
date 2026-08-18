/**
 * OCC Live - Stage Event System (Part 6)
 * Main Stage infrastructure with configurable lighting, effects,
 * and future event hooks. The stage functions as the primary gathering
 * point for social activity and future scheduled events.
 *
 * Design:
 * - Dance area around the stage (multiple avatars simultaneously)
 * - Configurable stage lighting (color, intensity, patterns)
 * - Stage effects hooks (particles, spotlights, strobes)
 * - Event state machine (idle/warmup/active/cooldown)
 * - Music integration with the stage zone
 * - NPC dancer spawning near stage during events
 * - Developer controls for testing stage states
 *
 * NOT implemented yet:
 * - Full event scheduler
 * - Concert system
 * - DJ booth
 * - Synchronized choreography
 */

import * as THREE from 'three';
import type { Vec3 } from '../types/index.ts';

// ─── Stage Configuration ─────────────────────────────────────────────────────

export interface StageLightConfig {
  id: string;
  color: number;
  intensity: number;
  position: Vec3;
  type: 'spot' | 'point' | 'ambient';
  animated: boolean;
  animationSpeed: number;
}

export interface StageEffectConfig {
  id: string;
  type: 'particles' | 'strobe' | 'fog' | 'spotlight_sweep';
  enabled: boolean;
  intensity: number;
}

export interface StageEventConfig {
  id: string;
  name: string;
  description: string;
  /** Playlist to play during this event */
  playlistId: string | null;
  /** Lighting preset */
  lights: StageLightConfig[];
  /** Effects to activate */
  effects: StageEffectConfig[];
  /** NPC dancer count during event */
  npcDancerCount: number;
  /** Duration in minutes (0 = indefinite) */
  duration: number;
}

export interface StageConfig {
  position: Vec3;
  radius: number;
  danceRadius: number;
  defaultLights: StageLightConfig[];
  defaultEffects: StageEffectConfig[];
  events: StageEventConfig[];
}

// ─── Stage State ─────────────────────────────────────────────────────────────

export type StageState = 'idle' | 'warmup' | 'active' | 'cooldown';

// ─── Stage Event System ──────────────────────────────────────────────────────

export class StageEventSystem {
  private scene: THREE.Scene;
  private config: StageConfig;
  private stageGroup: THREE.Group;
  private state: StageState = 'idle';
  private currentEvent: StageEventConfig | null = null;
  private lights: Map<string, THREE.Light> = new Map();
  private dancers: Set<string> = new Set(); // Session IDs of dancing players
  private stateTimer: number = 0;
  private stageCenter: THREE.Vector3;

  // Callbacks
  private onStateChange: ((state: StageState, event: StageEventConfig | null) => void) | null = null;
  private onDancerJoin: ((sessionId: string) => void) | null = null;
  private onDancerLeave: ((sessionId: string) => void) | null = null;

  constructor(scene: THREE.Scene, config: StageConfig) {
    this.scene = scene;
    this.config = config;
    this.stageCenter = new THREE.Vector3(config.position[0], config.position[1], config.position[2]);

    this.stageGroup = new THREE.Group();
    this.stageGroup.name = 'main_stage';
    this.stageGroup.position.copy(this.stageCenter);
    this.scene.add(this.stageGroup);

    // Setup default lighting
    this.setupDefaultLighting();
  }

  // ─── State Management ──────────────────────────────────────────────────

  /** Get the current stage state */
  getState(): StageState {
    return this.state;
  }

  /** Get the current event (if any) */
  getCurrentEvent(): StageEventConfig | null {
    return this.currentEvent;
  }

  /** Start an event by ID */
  startEvent(eventId: string): boolean {
    const event = this.config.events.find(e => e.id === eventId);
    if (!event) return false;

    this.currentEvent = event;
    this.transitionTo('warmup');

    // After warmup period, go active
    setTimeout(() => {
      if (this.state === 'warmup') {
        this.transitionTo('active');
      }
    }, 5000); // 5 second warmup

    return true;
  }

  /** End the current event */
  endEvent(): void {
    if (this.state === 'idle') return;
    this.transitionTo('cooldown');

    // After cooldown, return to idle
    setTimeout(() => {
      if (this.state === 'cooldown') {
        this.transitionTo('idle');
        this.currentEvent = null;
      }
    }, 3000); // 3 second cooldown
  }

  /** Force a specific state (dev mode) */
  forceState(state: StageState): void {
    this.transitionTo(state);
  }

  // ─── Dance Management ──────────────────────────────────────────────────

  /** Player starts dancing near the stage */
  joinDance(sessionId: string): void {
    this.dancers.add(sessionId);
    this.onDancerJoin?.(sessionId);
  }

  /** Player stops dancing */
  leaveDance(sessionId: string): void {
    this.dancers.delete(sessionId);
    this.onDancerLeave?.(sessionId);
  }

  /** Is a player dancing at the stage? */
  isDancing(sessionId: string): boolean {
    return this.dancers.has(sessionId);
  }

  /** Get the number of active dancers */
  getDancerCount(): number {
    return this.dancers.size;
  }

  /** Get all dancer session IDs */
  getDancers(): string[] {
    return Array.from(this.dancers);
  }

  /** Check if a position is within the dance area */
  isInDanceArea(position: THREE.Vector3): boolean {
    const dist = position.distanceTo(this.stageCenter);
    return dist <= this.config.danceRadius;
  }

  // ─── Update Loop ───────────────────────────────────────────────────────

  /** Update stage effects and animations — call each frame */
  update(dt: number): void {
    this.stateTimer += dt;

    // Animate lights based on state
    if (this.state === 'active' || this.state === 'warmup') {
      this.updateAnimatedLights(dt);
    }
  }

  // ─── Callbacks ─────────────────────────────────────────────────────────

  /** Set callback for state changes */
  setOnStateChange(callback: (state: StageState, event: StageEventConfig | null) => void): void {
    this.onStateChange = callback;
  }

  /** Set callback for dancer join */
  setOnDancerJoin(callback: (sessionId: string) => void): void {
    this.onDancerJoin = callback;
  }

  /** Set callback for dancer leave */
  setOnDancerLeave(callback: (sessionId: string) => void): void {
    this.onDancerLeave = callback;
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get the stage center position */
  getCenter(): THREE.Vector3 {
    return this.stageCenter.clone();
  }

  /** Get the dance area radius */
  getDanceRadius(): number {
    return this.config.danceRadius;
  }

  /** Get available events */
  getAvailableEvents(): StageEventConfig[] {
    return this.config.events;
  }

  /** Get debug info */
  getDebugInfo(): { state: StageState; event: string | null; dancers: number; lights: number } {
    return {
      state: this.state,
      event: this.currentEvent?.name ?? null,
      dancers: this.dancers.size,
      lights: this.lights.size,
    };
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  /** Remove all stage elements */
  dispose(): void {
    this.scene.remove(this.stageGroup);
    this.lights.clear();
    this.dancers.clear();
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private transitionTo(state: StageState): void {
    this.state = state;
    this.stateTimer = 0;

    switch (state) {
      case 'idle':
        this.applyIdleLighting();
        break;
      case 'warmup':
        this.applyWarmupLighting();
        break;
      case 'active':
        this.applyActiveLighting();
        break;
      case 'cooldown':
        this.applyCooldownLighting();
        break;
    }

    this.onStateChange?.(state, this.currentEvent);
  }

  private setupDefaultLighting(): void {
    for (const lightConfig of this.config.defaultLights) {
      this.createLight(lightConfig);
    }
  }

  private createLight(config: StageLightConfig): void {
    let light: THREE.Light;

    switch (config.type) {
      case 'spot': {
        const spotLight = new THREE.PointLight(config.color, config.intensity, 30);
        spotLight.castShadow = true;
        light = spotLight;
        break;
      }
      case 'point': {
        light = new THREE.PointLight(config.color, config.intensity, 20);
        break;
      }
      case 'ambient':
      default: {
        light = new THREE.AmbientLight(config.color, config.intensity);
        break;
      }
    }

    light.position.set(config.position[0], config.position[1], config.position[2]);
    light.name = `stage_light_${config.id}`;
    light.userData = { animated: config.animated, speed: config.animationSpeed, lightId: config.id };

    this.stageGroup.add(light);
    this.lights.set(config.id, light);
  }

  private updateAnimatedLights(_dt: number): void {
    const time = performance.now() * 0.001;

    for (const [, light] of this.lights) {
      if (!light.userData.animated) continue;

      const speed = light.userData.speed || 1;

      // Color cycling for animated lights
      if (light instanceof THREE.PointLight) {
        const hue = (time * speed * 0.1) % 1;
        light.color.setHSL(hue, 0.8, 0.5);
      }
    }
  }

  private applyIdleLighting(): void {
    // Dim, warm ambient lighting
    for (const [, light] of this.lights) {
      if (light instanceof THREE.PointLight) {
        light.intensity = 0.3;
      }
      light.userData.animated = false;
    }
  }

  private applyWarmupLighting(): void {
    // Slowly brightening
    for (const [, light] of this.lights) {
      if (light instanceof THREE.PointLight) {
        light.intensity = 0.6;
      }
      light.userData.animated = true;
    }
  }

  private applyActiveLighting(): void {
    // Full brightness, all effects
    for (const [, light] of this.lights) {
      if (light instanceof THREE.PointLight) {
        light.intensity = 1.5;
      }
      light.userData.animated = true;
    }
  }

  private applyCooldownLighting(): void {
    // Fading back to idle
    for (const [, light] of this.lights) {
      if (light instanceof THREE.PointLight) {
        light.intensity = 0.5;
      }
      light.userData.animated = false;
    }
  }
}
