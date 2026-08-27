/**
 * OCC Live - Energy Reaction Renderer
 * Creates and positions camera-facing 2D billboard reactions in the 3D scene.
 * Reactions appear above the avatar, always face the camera, animate
 * (scale-up, bounce, pulse, fade), and auto-remove after a duration.
 *
 * Design:
 * - 2D billboards using THREE.Sprite with CanvasTexture
 * - Always face the active camera (sprites do this automatically)
 * - Spawn above or slightly beside the avatar
 * - Animate independently of the avatar (no rigging needed)
 * - Object pooling for reuse
 * - Multiple users can trigger reactions simultaneously without conflict
 * - Automatic cleanup after duration
 * - No 3D emoji/GLB models required
 * - Modular — individual symbols can be replaced without rewriting logic
 */

import * as THREE from 'three';
import type { EnergyReaction } from './energy-wheel-ui.ts';

// ─── Reaction Instance ───────────────────────────────────────────────────────

export interface ActiveReaction {
  id: number;
  reaction: EnergyReaction;
  sprite: THREE.Sprite;
  /** Time elapsed since spawn (seconds) */
  elapsed: number;
  /** Total duration before removal (seconds) */
  duration: number;
  /** Starting Y offset above avatar */
  baseY: number;
  /** Phase for animation (randomized per instance) */
  phase: number;
  /** Whether this reaction is from a remote player */
  isRemote: boolean;
  /** Session ID of the player who triggered it (for positioning) */
  sessionId: string | null;
}

// ─── Configuration ───────────────────────────────────────────────────────────

export interface ReactionRendererConfig {
  /** Duration reactions stay visible (seconds) */
  displayDuration: number;
  /** Height above avatar to spawn (world units) */
  spawnHeight: number;
  /** Maximum simultaneous reactions per player */
  maxPerPlayer: number;
  /** Maximum total active reactions in scene */
  maxTotal: number;
  /** Size of the billboard sprite */
  spriteSize: number;
}

const DEFAULT_CONFIG: ReactionRendererConfig = {
  displayDuration: 2.5,
  spawnHeight: 2.8,
  maxPerPlayer: 3,
  maxTotal: 30,
  spriteSize: 1.2,
};

// ─── Reaction Renderer ───────────────────────────────────────────────────────

export class EnergyReactionRenderer {
  private scene: THREE.Scene;
  private config: ReactionRendererConfig;
  private activeReactions: ActiveReaction[] = [];
  private textureCache: Map<string, THREE.Texture> = new Map();
  private nextId: number = 0;

  // Pool of reusable sprites
  private spritePool: THREE.Sprite[] = [];
  private maxPoolSize: number = 20;

  constructor(scene: THREE.Scene, config?: Partial<ReactionRendererConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Spawn Reactions ───────────────────────────────────────────────────

  /**
   * Spawn a reaction at a world position (above avatar).
   * Returns the active reaction instance.
   */
  spawnReaction(
    reaction: EnergyReaction,
    position: THREE.Vector3,
    sessionId: string | null = null,
    isRemote: boolean = false
  ): ActiveReaction | null {
    // Enforce limits
    if (this.activeReactions.length >= this.config.maxTotal) {
      // Remove oldest
      this.removeReaction(this.activeReactions[0]);
    }

    if (sessionId) {
      const playerReactions = this.activeReactions.filter(r => r.sessionId === sessionId);
      if (playerReactions.length >= this.config.maxPerPlayer) {
        this.removeReaction(playerReactions[0]);
      }
    }

    // Get or create sprite
    const sprite = this.getSprite(reaction);
    
    // Position above avatar with slight random offset
    const offsetX = (Math.random() - 0.5) * 0.5;
    const spawnY = position.y + this.config.spawnHeight;
    sprite.position.set(position.x + offsetX, spawnY, position.z);
    sprite.scale.set(0.01, 0.01, 0.01); // Start tiny (will scale up)
    sprite.visible = true;

    this.scene.add(sprite);

    const instance: ActiveReaction = {
      id: this.nextId++,
      reaction,
      sprite,
      elapsed: 0,
      duration: this.config.displayDuration,
      baseY: spawnY,
      phase: Math.random() * Math.PI * 2,
      isRemote,
      sessionId,
    };

    this.activeReactions.push(instance);
    return instance;
  }

  /**
   * Spawn a reaction for the local player at their current position.
   */
  spawnLocal(reaction: EnergyReaction, avatarPosition: THREE.Vector3, sessionId: string): ActiveReaction | null {
    return this.spawnReaction(reaction, avatarPosition, sessionId, false);
  }

  /**
   * Spawn a reaction for a remote player at their position.
   */
  spawnRemote(reaction: EnergyReaction, position: THREE.Vector3, sessionId: string): ActiveReaction | null {
    return this.spawnReaction(reaction, position, sessionId, true);
  }

  // ─── Update Loop ───────────────────────────────────────────────────────

  /**
   * Call each frame. Animates active reactions and removes expired ones.
   */
  update(dt: number): void {
    const toRemove: ActiveReaction[] = [];

    for (const instance of this.activeReactions) {
      instance.elapsed += dt;

      // Calculate normalized time (0 to 1)
      const t = instance.elapsed / instance.duration;

      if (t >= 1) {
        toRemove.push(instance);
        continue;
      }

      // Animate the sprite
      this.animateReaction(instance, t);
    }

    // Remove expired reactions
    for (const instance of toRemove) {
      this.removeReaction(instance);
    }
  }

  // ─── Animation ─────────────────────────────────────────────────────────

  private animateReaction(instance: ActiveReaction, t: number): void {
    const sprite = instance.sprite;
    const size = this.config.spriteSize;

    // Phase 1: Scale up (0 → 0.15)
    // Phase 2: Bounce/pulse (0.15 → 0.7)
    // Phase 3: Fade out (0.7 → 1.0)

    let scale: number;
    let alpha: number;
    let yOffset: number;

    if (t < 0.15) {
      // Quick scale-up with overshoot
      const easeT = t / 0.15;
      scale = size * this.easeOutBack(easeT);
      alpha = easeT;
      yOffset = 0;
    } else if (t < 0.7) {
      // Gentle float upward + subtle pulse
      const pulseT = (t - 0.15) / 0.55;
      const pulse = 1 + Math.sin((pulseT * Math.PI * 4) + instance.phase) * 0.08;
      scale = size * pulse;
      alpha = 1;
      yOffset = pulseT * 0.6; // Float up slowly
    } else {
      // Fade out + continue floating up
      const fadeT = (t - 0.7) / 0.3;
      scale = size * (1 - fadeT * 0.3); // Slight shrink
      alpha = 1 - fadeT;
      yOffset = 0.6 + fadeT * 0.4; // Continue floating
    }

    sprite.scale.set(scale, scale, scale);
    sprite.position.y = instance.baseY + yOffset;

    // Set opacity
    if (sprite.material) {
      (sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, alpha);
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // ─── Sprite Management ─────────────────────────────────────────────────

  private getSprite(reaction: EnergyReaction): THREE.Sprite {
    // Try to get from pool
    const pooled = this.spritePool.pop();
    if (pooled) {
      // Update texture
      const texture = this.getTexture(reaction);
      (pooled.material as THREE.SpriteMaterial).map = texture;
      (pooled.material as THREE.SpriteMaterial).opacity = 1;
      pooled.material.needsUpdate = true;
      return pooled;
    }

    // Create new sprite
    const texture = this.getTexture(reaction);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    return new THREE.Sprite(material);
  }

  private getTexture(reaction: EnergyReaction): THREE.Texture {
    const cached = this.textureCache.get(reaction.id);
    if (cached) return cached;

    // Create canvas texture with the emoji symbol
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Clear with transparency
    ctx.clearRect(0, 0, size, size);

    // Subtle glow background
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, reaction.color + '40'); // 25% opacity
    gradient.addColorStop(0.6, reaction.color + '15');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Draw emoji
    ctx.font = `${size * 0.6}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(reaction.symbol, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    this.textureCache.set(reaction.id, texture);
    return texture;
  }

  private removeReaction(instance: ActiveReaction): void {
    const idx = this.activeReactions.indexOf(instance);
    if (idx >= 0) this.activeReactions.splice(idx, 1);

    // Remove from scene
    this.scene.remove(instance.sprite);
    instance.sprite.visible = false;

    // Return to pool if not full
    if (this.spritePool.length < this.maxPoolSize) {
      this.spritePool.push(instance.sprite);
    } else {
      // Dispose if pool is full
      (instance.sprite.material as THREE.SpriteMaterial).dispose();
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get all currently active reactions */
  getActiveReactions(): ActiveReaction[] {
    return [...this.activeReactions];
  }

  /** Get active reaction count */
  getActiveCount(): number {
    return this.activeReactions.length;
  }

  /** Get reactions for a specific player */
  getPlayerReactions(sessionId: string): ActiveReaction[] {
    return this.activeReactions.filter(r => r.sessionId === sessionId);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Remove all active reactions */
  clearAll(): void {
    for (const instance of [...this.activeReactions]) {
      this.removeReaction(instance);
    }
  }

  /** Dispose all resources */
  dispose(): void {
    this.clearAll();
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
    for (const sprite of this.spritePool) {
      (sprite.material as THREE.SpriteMaterial).dispose();
    }
    this.spritePool = [];
  }
}
