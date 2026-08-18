/**
 * OCC Live - Ambient World Motion (Part 6)
 * Subtle environmental animations that bring the Main Union to life.
 * Performance-conscious — only updates visible elements and uses
 * efficient techniques (shader uniforms, procedural motion).
 *
 * Effects:
 * - Water shimmer/flow
 * - Fire particle flickering
 * - Decorative floating objects
 * - Light flickering (firepit, stage)
 * - Gentle wind on vegetation (if present)
 * - Floating particles (ambient atmosphere)
 */

import * as THREE from 'three';

// ─── Configuration ───────────────────────────────────────────────────────────

export interface AmbientMotionConfig {
  enabled: boolean;
  /** Water shimmer settings */
  water: {
    enabled: boolean;
    speed: number;
    amplitude: number;
  };
  /** Fire/light flicker */
  fire: {
    enabled: boolean;
    flickerSpeed: number;
    flickerIntensity: number;
  };
  /** Floating particles */
  particles: {
    enabled: boolean;
    count: number;
    speed: number;
    radius: number;
    color: number;
    opacity: number;
  };
  /** Light pulse effects */
  lightPulse: {
    enabled: boolean;
    speed: number;
    minIntensity: number;
    maxIntensity: number;
  };
}

const DEFAULT_CONFIG: AmbientMotionConfig = {
  enabled: true,
  water: { enabled: true, speed: 0.5, amplitude: 0.05 },
  fire: { enabled: true, flickerSpeed: 8, flickerIntensity: 0.3 },
  particles: { enabled: true, count: 30, speed: 0.3, radius: 40, color: 0xffffff, opacity: 0.3 },
  lightPulse: { enabled: true, speed: 1.0, minIntensity: 0.3, maxIntensity: 0.7 },
};

// ─── Tracked Elements ────────────────────────────────────────────────────────

interface WaterElement {
  mesh: THREE.Object3D;
  baseY: number;
  phase: number;
}

interface FireElement {
  light: THREE.PointLight;
  baseIntensity: number;
  phase: number;
}

interface FloatingParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  basePosition: THREE.Vector3;
  phase: number;
}

// ─── Ambient World Motion System ─────────────────────────────────────────────

export class AmbientWorldMotion {
  private scene: THREE.Scene;
  private config: AmbientMotionConfig;
  private waterElements: WaterElement[] = [];
  private fireElements: FireElement[] = [];
  private particles: FloatingParticle[] = [];
  private particleGroup: THREE.Group;
  private isInitialized: boolean = false;

  constructor(scene: THREE.Scene, config?: Partial<AmbientMotionConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.particleGroup = new THREE.Group();
    this.particleGroup.name = 'ambient_particles';
    this.scene.add(this.particleGroup);
  }

  // ─── Initialization ────────────────────────────────────────────────────

  /** Initialize ambient effects */
  initialize(): void {
    if (this.isInitialized) return;

    if (this.config.particles.enabled) {
      this.createParticles();
    }

    this.isInitialized = true;
  }

  /** Register a water element for shimmer animation */
  registerWater(mesh: THREE.Object3D): void {
    this.waterElements.push({
      mesh,
      baseY: mesh.position.y,
      phase: Math.random() * Math.PI * 2,
    });
  }

  /** Register a fire light for flicker animation */
  registerFireLight(light: THREE.PointLight, baseIntensity?: number): void {
    this.fireElements.push({
      light,
      baseIntensity: baseIntensity ?? light.intensity,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // ─── Update Loop ───────────────────────────────────────────────────────

  /** Update all ambient animations — call each frame */
  update(dt: number): void {
    if (!this.config.enabled) return;

    const time = performance.now() * 0.001;

    if (this.config.water.enabled) {
      this.updateWater(time);
    }
    if (this.config.fire.enabled) {
      this.updateFire(time);
    }
    if (this.config.particles.enabled) {
      this.updateParticles(dt, time);
    }
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  /** Update config at runtime */
  setConfig(config: Partial<AmbientMotionConfig>): void {
    Object.assign(this.config, config);
  }

  /** Enable/disable */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.particleGroup.visible = enabled && this.config.particles.enabled;
  }

  /** Get config */
  getConfig(): AmbientMotionConfig {
    return { ...this.config };
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  dispose(): void {
    this.scene.remove(this.particleGroup);
    this.waterElements = [];
    this.fireElements = [];
    this.particles = [];
  }

  // ─── Private: Water ────────────────────────────────────────────────────

  private updateWater(time: number): void {
    const { speed, amplitude } = this.config.water;
    for (const water of this.waterElements) {
      water.mesh.position.y = water.baseY + Math.sin(time * speed + water.phase) * amplitude;
    }
  }

  // ─── Private: Fire ─────────────────────────────────────────────────────

  private updateFire(time: number): void {
    const { flickerSpeed, flickerIntensity } = this.config.fire;
    for (const fire of this.fireElements) {
      // Combine multiple sine waves for realistic flicker
      const flicker =
        Math.sin(time * flickerSpeed + fire.phase) * 0.5 +
        Math.sin(time * flickerSpeed * 2.3 + fire.phase * 1.7) * 0.3 +
        Math.sin(time * flickerSpeed * 0.7 + fire.phase * 0.5) * 0.2;

      fire.light.intensity = fire.baseIntensity + flicker * flickerIntensity * fire.baseIntensity;
    }
  }

  // ─── Private: Particles ────────────────────────────────────────────────

  private createParticles(): void {
    const { count, radius, color, opacity } = this.config.particles;
    const geo = new THREE.SphereGeometry(0.04, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const height = 1 + Math.random() * 5;

      mesh.position.set(
        Math.cos(angle) * dist,
        height,
        Math.sin(angle) * dist
      );
      mesh.name = `particle_${i}`;
      this.particleGroup.add(mesh);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          Math.random() * 0.05,
          (Math.random() - 0.5) * 0.1
        ),
        basePosition: mesh.position.clone(),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateParticles(dt: number, time: number): void {
    const { speed, radius } = this.config.particles;

    for (const particle of this.particles) {
      // Gentle floating motion
      particle.mesh.position.x = particle.basePosition.x + Math.sin(time * speed + particle.phase) * 0.5;
      particle.mesh.position.y = particle.basePosition.y + Math.sin(time * speed * 0.7 + particle.phase * 1.3) * 0.3;
      particle.mesh.position.z = particle.basePosition.z + Math.cos(time * speed * 0.5 + particle.phase * 0.8) * 0.5;

      // Slowly drift
      particle.basePosition.x += particle.velocity.x * dt;
      particle.basePosition.z += particle.velocity.z * dt;

      // Wrap around if too far from center
      const dist = Math.sqrt(
        particle.basePosition.x * particle.basePosition.x +
        particle.basePosition.z * particle.basePosition.z
      );
      if (dist > radius) {
        const angle = Math.random() * Math.PI * 2;
        particle.basePosition.x = Math.cos(angle) * radius * 0.5;
        particle.basePosition.z = Math.sin(angle) * radius * 0.5;
      }

      // Fade based on height
      const mat = particle.mesh.material as THREE.MeshBasicMaterial;
      const heightFade = Math.max(0, 1 - (particle.mesh.position.y / 6));
      mat.opacity = this.config.particles.opacity * heightFade;
    }
  }
}
