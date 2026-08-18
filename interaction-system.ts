/**
 * OCC Live - Interaction System
 * Universal interaction framework. Objects declare interaction type, prompt,
 * radius, and the system handles proximity detection and UI prompts.
 */

import * as THREE from 'three';
import type { InteractionConfig } from '../types/index.ts';

export interface ActiveInteraction {
  config: InteractionConfig;
  mesh: THREE.Object3D;
  worldPosition: THREE.Vector3;
}

export class InteractionSystem {
  private interactions: Map<string, ActiveInteraction> = new Map();
  private scene: THREE.Scene;
  private currentNearby: ActiveInteraction | null = null;
  private promptElement: HTMLElement | null = null;
  private onInteract: ((interaction: InteractionConfig) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createPromptUI();
    this.setupInput();
  }

  /** Register all interactions from config */
  registerAll(interactions: InteractionConfig[]): void {
    for (const config of interactions) {
      if (config.enabled) {
        this.register(config);
      }
    }
  }

  /** Register a single interaction point */
  register(config: InteractionConfig): void {
    const mesh = this.createInteractionMesh(config);
    const worldPosition = new THREE.Vector3(config.position[0], config.position[1], config.position[2]);

    this.interactions.set(config.id, { config, mesh, worldPosition });
    this.scene.add(mesh);
  }

  /** Set interaction callback */
  onInteraction(callback: (interaction: InteractionConfig) => void): void {
    this.onInteract = callback;
  }

  /** Update proximity detection — call each frame with player position */
  update(playerPosition: THREE.Vector3): void {
    let closest: ActiveInteraction | null = null;
    let closestDist = Infinity;

    for (const interaction of this.interactions.values()) {
      const dist = playerPosition.distanceTo(interaction.worldPosition);
      if (dist <= interaction.config.radius && dist < closestDist) {
        closest = interaction;
        closestDist = dist;
      }
    }

    if (closest !== this.currentNearby) {
      this.currentNearby = closest;
      this.updatePrompt();
    }
  }

  /** Get the currently available interaction (if any) */
  getCurrentInteraction(): InteractionConfig | null {
    return this.currentNearby?.config ?? null;
  }

  /** Remove an interaction point */
  remove(id: string): void {
    const interaction = this.interactions.get(id);
    if (interaction) {
      this.scene.remove(interaction.mesh);
      this.interactions.delete(id);
    }
  }

  /** Dispose of UI and listeners */
  dispose(): void {
    this.promptElement?.remove();
    document.removeEventListener('keydown', this.onKeyPress);
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private createInteractionMesh(config: InteractionConfig): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `interaction_${config.id}`;
    group.userData = { interactionId: config.id, interactionType: config.interactionType };

    // Glowing marker sphere
    const markerGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.7,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.y = 1.5;
    group.add(marker);

    // Radius ring (subtle ground indicator)
    const ringGeo = new THREE.RingGeometry(config.radius - 0.05, config.radius, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);

    group.position.set(config.position[0], config.position[1], config.position[2]);
    return group;
  }

  private createPromptUI(): void {
    this.promptElement = document.createElement('div');
    this.promptElement.id = 'interaction-prompt';
    this.promptElement.style.cssText = `
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: sans-serif;
      font-size: 16px;
      display: none;
      z-index: 100;
      pointer-events: none;
      border: 1px solid rgba(255, 221, 68, 0.5);
    `;
    document.body.appendChild(this.promptElement);
  }

  /** Override the current prompt text (for toggle states) */
  setPromptOverride(text: string | null): void {
    if (!this.promptElement) return;
    if (text) {
      this.promptElement.textContent = text;
      this.promptElement.style.display = 'block';
    } else {
      this.updatePrompt();
    }
  }

  private updatePrompt(): void {
    if (!this.promptElement) return;

    if (this.currentNearby) {
      this.promptElement.textContent = `[E] ${this.currentNearby.config.prompt}`;
      this.promptElement.style.display = 'block';
    } else {
      this.promptElement.style.display = 'none';
    }
  }

  private setupInput(): void {
    document.addEventListener('keydown', this.onKeyPress);
  }

  private onKeyPress = (e: KeyboardEvent): void => {
    if (e.key.toLowerCase() === 'e' && this.currentNearby) {
      this.triggerInteraction(this.currentNearby);
    }
  };

  private triggerInteraction(interaction: ActiveInteraction): void {
    if (this.onInteract) {
      this.onInteract(interaction.config);
    }

    // Visual feedback - pulse the marker
    const marker = interaction.mesh.children[0] as THREE.Mesh;
    if (marker) {
      const originalScale = marker.scale.clone();
      marker.scale.setScalar(1.5);
      setTimeout(() => marker.scale.copy(originalScale), 200);
    }
  }
}
