/**
 * OCC Live - Event Lighting Controller (Part 7)
 * Configurable lighting presets that overlay the Main Union's normal
 * lighting during events. Smooth transitions via lerping.
 *
 * Presets:
 * - normal: Default evening golden hour
 * - kickoff: Bright, warm, celebratory
 * - dance: Dynamic colored lighting
 * - festival: Saturated, multi-color
 * - chill: Soft cool tones
 * - throwback: Retro neon pink/purple
 * - rave: High-energy strobing colors
 * - custom: Fully configurable via event config
 */

import * as THREE from 'three';
import type { LightingPresetName, LightingCustomConfig } from './event-types.ts';
import type { EventLightingController } from './event-manager.ts';

// ─── Preset Definitions ──────────────────────────────────────────────────────

interface LightingPresetValues {
  ambientColor: number;
  ambientIntensity: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  animated: boolean;
  animationSpeed: number;
}

const PRESETS: Record<LightingPresetName, LightingPresetValues> = {
  normal: {
    ambientColor: 0xffd4a0,
    ambientIntensity: 0.4,
    fogColor: 0x2d1b4e,
    fogNear: 60,
    fogFar: 150,
    animated: false,
    animationSpeed: 0,
  },
  kickoff: {
    ambientColor: 0xffeebb,
    ambientIntensity: 0.6,
    fogColor: 0x1a0a2e,
    fogNear: 80,
    fogFar: 200,
    animated: false,
    animationSpeed: 0,
  },
  dance: {
    ambientColor: 0x7744ff,
    ambientIntensity: 0.3,
    fogColor: 0x110022,
    fogNear: 40,
    fogFar: 120,
    animated: true,
    animationSpeed: 2.0,
  },
  festival: {
    ambientColor: 0xff6600,
    ambientIntensity: 0.5,
    fogColor: 0x220a00,
    fogNear: 50,
    fogFar: 140,
    animated: true,
    animationSpeed: 1.5,
  },
  chill: {
    ambientColor: 0x88ccff,
    ambientIntensity: 0.35,
    fogColor: 0x0a1a2e,
    fogNear: 70,
    fogFar: 180,
    animated: false,
    animationSpeed: 0,
  },
  throwback: {
    ambientColor: 0xff44aa,
    ambientIntensity: 0.4,
    fogColor: 0x1a0022,
    fogNear: 45,
    fogFar: 130,
    animated: true,
    animationSpeed: 1.0,
  },
  rave: {
    ambientColor: 0x00ffcc,
    ambientIntensity: 0.25,
    fogColor: 0x000011,
    fogNear: 30,
    fogFar: 100,
    animated: true,
    animationSpeed: 4.0,
  },
  custom: {
    ambientColor: 0xffffff,
    ambientIntensity: 0.5,
    fogColor: 0x000000,
    fogNear: 60,
    fogFar: 150,
    animated: false,
    animationSpeed: 1.0,
  },
};

// ─── Event Lighting Controller ───────────────────────────────────────────────

export class EventLightingControllerImpl implements EventLightingController {
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight | null = null;
  private currentPreset: LightingPresetName = 'normal';
  private targetValues: LightingPresetValues;
  private currentValues: LightingPresetValues;
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 0;
  private startValues: LightingPresetValues;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.targetValues = { ...PRESETS.normal };
    this.currentValues = { ...PRESETS.normal };
    this.startValues = { ...PRESETS.normal };

    // Find existing ambient light in the scene
    this.scene.traverse((child) => {
      if (child instanceof THREE.AmbientLight) {
        this.ambientLight = child;
      }
    });
  }

  /** Apply a lighting preset with smooth transition */
  applyPreset(preset: LightingPresetName, transitionDuration: number, custom?: LightingCustomConfig | null): void {
    this.currentPreset = preset;

    if (preset === 'custom' && custom) {
      this.targetValues = {
        ambientColor: custom.ambientColor,
        ambientIntensity: custom.ambientIntensity,
        fogColor: custom.fogColor,
        fogNear: custom.fogNear,
        fogFar: custom.fogFar,
        animated: custom.animated,
        animationSpeed: custom.animationSpeed,
      };
    } else {
      this.targetValues = { ...PRESETS[preset] };
    }

    this.startValues = { ...this.currentValues };
    this.transitionDuration = transitionDuration;
    this.transitionProgress = 0;
    this.isTransitioning = true;

    console.log(`[EventLighting] Transitioning to preset: ${preset} (${transitionDuration}s)`);
  }

  /** Restore normal lighting */
  restoreNormal(transitionDuration: number): void {
    this.applyPreset('normal', transitionDuration);
  }

  /** Get current preset name */
  getCurrentPreset(): LightingPresetName {
    return this.currentPreset;
  }

  /** Update — call each frame for smooth transitions */
  update(dt: number): void {
    if (!this.isTransitioning) {
      // Apply animation if the current preset is animated
      if (this.currentValues.animated) {
        this.updateAnimation();
      }
      return;
    }

    // Lerp toward target
    this.transitionProgress += dt / this.transitionDuration;
    if (this.transitionProgress >= 1.0) {
      this.transitionProgress = 1.0;
      this.isTransitioning = false;
    }

    const t = this.smoothstep(this.transitionProgress);

    // Interpolate values
    this.currentValues.ambientIntensity = this.lerp(this.startValues.ambientIntensity, this.targetValues.ambientIntensity, t);
    this.currentValues.fogNear = this.lerp(this.startValues.fogNear, this.targetValues.fogNear, t);
    this.currentValues.fogFar = this.lerp(this.startValues.fogFar, this.targetValues.fogFar, t);
    this.currentValues.ambientColor = this.targetValues.ambientColor; // Color snaps (lerp color is complex)
    this.currentValues.fogColor = this.targetValues.fogColor;
    this.currentValues.animated = this.targetValues.animated;
    this.currentValues.animationSpeed = this.targetValues.animationSpeed;

    // Apply to scene
    this.applyToScene();
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private applyToScene(): void {
    if (this.ambientLight) {
      this.ambientLight.color.setHex(this.currentValues.ambientColor);
      this.ambientLight.intensity = this.currentValues.ambientIntensity;
    }

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.setHex(this.currentValues.fogColor);
      (this.scene.fog as any).near = this.currentValues.fogNear;
      (this.scene.fog as any).far = this.currentValues.fogFar;
    }
  }

  private updateAnimation(): void {
    if (!this.ambientLight) return;
    const time = performance.now() * 0.001 * this.currentValues.animationSpeed;
    const hue = (time * 0.05) % 1;
    this.ambientLight.color.setHSL(hue, 0.6, 0.4);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }
}
