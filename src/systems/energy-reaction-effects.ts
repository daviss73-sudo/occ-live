/**
 * OCC Live - Energy Reaction Effects
 * Lightweight particle/effect animations that supplement the 2D billboard reactions.
 * Each reaction type has a unique visual treatment (flames, sparks, ripples, etc.).
 *
 * Design:
 * - Small particle bursts triggered alongside billboard reactions
 * - Effects are visually playful but lightweight and non-obstructive
 * - Each effect lasts 1.5-3 seconds then auto-removes
 * - Object pooling for particle sprites
 * - Cleaned up automatically (never accumulate in scene)
 * - Works without avatar animation
 * - Respects reduced-motion accessibility setting
 * - Location-aware architecture (future: zone-specific effect overrides)
 */

import * as THREE from 'three';
import type { EnergyReaction } from './energy-wheel-ui.ts';

// ─── Particle Instance ───────────────────────────────────────────────────────

interface Particle {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  elapsed: number;
  duration: number;
  startScale: number;
  endScale: number;
  startAlpha: number;
  gravity: number;
  rotationSpeed: number;
}

// ─── Active Effect ───────────────────────────────────────────────────────────

interface ActiveEffect {
  id: number;
  reactionId: string;
  particles: Particle[];
  elapsed: number;
  duration: number;
}

// ─── Effect Definitions ──────────────────────────────────────────────────────

interface EffectDefinition {
  particleCount: number;
  duration: number;
  color: number;
  secondaryColor?: number;
  spread: number;
  speed: number;
  gravity: number;
  startScale: number;
  endScale: number;
  pattern: 'burst' | 'fountain' | 'ring' | 'float' | 'orbit';
}

const EFFECT_DEFINITIONS: Record<string, EffectDefinition> = {
  fire: {
    particleCount: 12,
    duration: 1.8,
    color: 0xff4400,
    secondaryColor: 0xffaa00,
    spread: 0.4,
    speed: 2.5,
    gravity: -1.5, // Float upward
    startScale: 0.15,
    endScale: 0.02,
    pattern: 'fountain',
  },
  lightning: {
    particleCount: 8,
    duration: 1.2,
    color: 0xffdd00,
    secondaryColor: 0xffffff,
    spread: 0.8,
    speed: 4.0,
    gravity: 0,
    startScale: 0.12,
    endScale: 0.0,
    pattern: 'burst',
  },
  sparkle: {
    particleCount: 10,
    duration: 2.0,
    color: 0xffee88,
    secondaryColor: 0xffffff,
    spread: 0.6,
    speed: 1.0,
    gravity: -0.3,
    startScale: 0.1,
    endScale: 0.0,
    pattern: 'float',
  },
  boom: {
    particleCount: 16,
    duration: 1.5,
    color: 0xff6600,
    secondaryColor: 0xff2200,
    spread: 1.2,
    speed: 5.0,
    gravity: 0.5,
    startScale: 0.2,
    endScale: 0.0,
    pattern: 'burst',
  },
  celebrate: {
    particleCount: 14,
    duration: 2.5,
    color: 0xff44cc,
    secondaryColor: 0x44ccff,
    spread: 0.8,
    speed: 3.0,
    gravity: 1.5,
    startScale: 0.12,
    endScale: 0.04,
    pattern: 'fountain',
  },
  wave: {
    particleCount: 8,
    duration: 2.2,
    color: 0x4488ff,
    secondaryColor: 0x88ccff,
    spread: 1.0,
    speed: 1.2,
    gravity: 0,
    startScale: 0.15,
    endScale: 0.05,
    pattern: 'ring',
  },
  cosmic: {
    particleCount: 10,
    duration: 2.5,
    color: 0xaa66ff,
    secondaryColor: 0xffaaff,
    spread: 0.5,
    speed: 1.5,
    gravity: -0.2,
    startScale: 0.1,
    endScale: 0.03,
    pattern: 'orbit',
  },
  moon: {
    particleCount: 6,
    duration: 3.0,
    color: 0x8899bb,
    secondaryColor: 0xccddff,
    spread: 0.4,
    speed: 0.5,
    gravity: -0.4,
    startScale: 0.12,
    endScale: 0.06,
    pattern: 'float',
  },
};

// ─── Energy Reaction Effects ─────────────────────────────────────────────────

export class EnergyReactionEffects {
  private scene: THREE.Scene;
  private activeEffects: ActiveEffect[] = [];
  private particlePool: THREE.Sprite[] = [];
  private maxPoolSize: number = 50;
  private nextId: number = 0;
  private reducedMotion: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  /** Set reduced motion (disables particle effects) */
  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    if (enabled) {
      this.clearAll();
    }
  }

  // ─── Trigger Effects ───────────────────────────────────────────────────

  /**
   * Trigger the particle effect for a reaction at a world position.
   * Call this alongside the billboard spawn for the full visual.
   */
  triggerEffect(reaction: EnergyReaction, position: THREE.Vector3): void {
    if (this.reducedMotion) return;

    const def = EFFECT_DEFINITIONS[reaction.id];
    if (!def) return;

    const particles: Particle[] = [];

    for (let i = 0; i < def.particleCount; i++) {
      const particle = this.createParticle(def, position, i, def.particleCount);
      particles.push(particle);
      this.scene.add(particle.sprite);
    }

    this.activeEffects.push({
      id: this.nextId++,
      reactionId: reaction.id,
      particles,
      elapsed: 0,
      duration: def.duration,
    });
  }

  // ─── Update Loop ───────────────────────────────────────────────────────

  /**
   * Call each frame. Updates particle positions and removes expired effects.
   */
  update(dt: number): void {
    if (this.reducedMotion) return;

    const toRemove: ActiveEffect[] = [];

    for (const effect of this.activeEffects) {
      effect.elapsed += dt;

      if (effect.elapsed >= effect.duration) {
        toRemove.push(effect);
        continue;
      }

      const t = effect.elapsed / effect.duration;

      // Update each particle
      for (const particle of effect.particles) {
        particle.elapsed += dt;
        const pt = Math.min(1, particle.elapsed / particle.duration);

        // Apply velocity and gravity
        particle.sprite.position.x += particle.velocity.x * dt;
        particle.sprite.position.y += particle.velocity.y * dt;
        particle.sprite.position.z += particle.velocity.z * dt;
        particle.velocity.y -= particle.gravity * dt;

        // Scale interpolation
        const scale = particle.startScale + (particle.endScale - particle.startScale) * pt;
        particle.sprite.scale.set(scale, scale, scale);

        // Alpha fade
        const alpha = particle.startAlpha * (1 - pt);
        (particle.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, alpha);

        // Rotation (visual interest)
        if (particle.rotationSpeed !== 0) {
          (particle.sprite.material as THREE.SpriteMaterial).rotation += particle.rotationSpeed * dt;
        }
      }
    }

    // Cleanup expired effects
    for (const effect of toRemove) {
      this.removeEffect(effect);
    }
  }

  // ─── Particle Creation ─────────────────────────────────────────────────

  private createParticle(
    def: EffectDefinition,
    origin: THREE.Vector3,
    index: number,
    total: number
  ): Particle {
    const sprite = this.getPooledSprite(def, index);

    // Calculate initial velocity based on pattern
    const velocity = new THREE.Vector3();
    const angle = (index / total) * Math.PI * 2;

    switch (def.pattern) {
      case 'burst': {
        // Radial burst in all directions
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI - Math.PI / 2;
        velocity.set(
          Math.cos(theta) * Math.cos(phi) * def.speed,
          Math.sin(phi) * def.speed * 0.8 + 1,
          Math.sin(theta) * Math.cos(phi) * def.speed
        );
        break;
      }
      case 'fountain': {
        // Upward with slight spread
        velocity.set(
          (Math.random() - 0.5) * def.spread * def.speed,
          def.speed * (0.7 + Math.random() * 0.3),
          (Math.random() - 0.5) * def.spread * def.speed
        );
        break;
      }
      case 'ring': {
        // Expanding ring
        velocity.set(
          Math.cos(angle) * def.speed,
          (Math.random() - 0.5) * 0.5,
          Math.sin(angle) * def.speed
        );
        break;
      }
      case 'float': {
        // Gentle floating upward
        velocity.set(
          (Math.random() - 0.5) * def.spread,
          def.speed * (0.3 + Math.random() * 0.5),
          (Math.random() - 0.5) * def.spread
        );
        break;
      }
      case 'orbit': {
        // Circular orbit motion
        velocity.set(
          Math.cos(angle) * def.speed * 0.5,
          def.speed * 0.3 + Math.random() * 0.5,
          Math.sin(angle) * def.speed * 0.5
        );
        break;
      }
    }

    // Random position offset from origin
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * def.spread * 0.3,
      Math.random() * 0.3,
      (Math.random() - 0.5) * def.spread * 0.3
    );

    sprite.position.copy(origin).add(offset);
    sprite.position.y += 2.5; // Above avatar
    sprite.scale.set(def.startScale, def.startScale, def.startScale);
    sprite.visible = true;
    (sprite.material as THREE.SpriteMaterial).opacity = 1;

    return {
      sprite,
      velocity,
      elapsed: 0,
      duration: def.duration * (0.6 + Math.random() * 0.4), // Vary per particle
      startScale: def.startScale,
      endScale: def.endScale,
      startAlpha: 1,
      gravity: def.gravity,
      rotationSpeed: (Math.random() - 0.5) * 3,
    };
  }

  // ─── Sprite Pool ───────────────────────────────────────────────────────

  private getPooledSprite(def: EffectDefinition, index: number): THREE.Sprite {
    const pooled = this.particlePool.pop();
    if (pooled) {
      // Recolor
      const mat = pooled.material as THREE.SpriteMaterial;
      const color = index % 2 === 0 ? def.color : (def.secondaryColor ?? def.color);
      mat.color.setHex(color);
      mat.opacity = 1;
      mat.rotation = 0;
      mat.needsUpdate = true;
      return pooled;
    }

    // Create new particle sprite (simple colored dot)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    // Soft circle
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const color = index % 2 === 0 ? def.color : (def.secondaryColor ?? def.color);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    material.color.setHex(color);

    return new THREE.Sprite(material);
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  private removeEffect(effect: ActiveEffect): void {
    const idx = this.activeEffects.indexOf(effect);
    if (idx >= 0) this.activeEffects.splice(idx, 1);

    for (const particle of effect.particles) {
      this.scene.remove(particle.sprite);
      particle.sprite.visible = false;

      if (this.particlePool.length < this.maxPoolSize) {
        this.particlePool.push(particle.sprite);
      } else {
        (particle.sprite.material as THREE.SpriteMaterial).map?.dispose();
        (particle.sprite.material as THREE.SpriteMaterial).dispose();
      }
    }
  }

  /** Remove all active effects */
  clearAll(): void {
    for (const effect of [...this.activeEffects]) {
      this.removeEffect(effect);
    }
  }

  /** Get count of active effects */
  getActiveCount(): number {
    return this.activeEffects.length;
  }

  /** Get total active particle count */
  getParticleCount(): number {
    let count = 0;
    for (const effect of this.activeEffects) {
      count += effect.particles.length;
    }
    return count;
  }

  /** Dispose all resources */
  dispose(): void {
    this.clearAll();
    for (const sprite of this.particlePool) {
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      (sprite.material as THREE.SpriteMaterial).dispose();
    }
    this.particlePool = [];
  }
}
