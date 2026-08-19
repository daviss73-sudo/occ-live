/**
 * OCC Live - Event Decoration System (Part 7)
 * Temporary decoration layers that appear during events and disappear
 * after. No permanent modification to the Main Union.
 *
 * Design:
 * - Decorations are configuration-driven (EventDecorationLayer)
 * - Each event has its own decoration layer
 * - On event start: spawn decorations into scene
 * - On event end: remove all event decorations
 * - Supports GLB assets and procedural geometry
 * - Animated decorations (rotation, bob, etc.)
 */

import * as THREE from 'three';
import type { EventConfig, EventDecoration } from './event-types.ts';
import type { EventDecorationController } from './event-manager.ts';

// ─── Active Decoration ───────────────────────────────────────────────────────

interface ActiveDecoration {
  config: EventDecoration;
  mesh: THREE.Object3D;
  animated: boolean;
  phaseOffset: number;
}

// ─── Event Decoration System ─────────────────────────────────────────────────

export class EventDecorationSystemImpl implements EventDecorationController {
  private scene: THREE.Scene;
  private decorationGroup: THREE.Group;
  private activeDecorations: ActiveDecoration[] = [];
  private isActive: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.decorationGroup = new THREE.Group();
    this.decorationGroup.name = 'event_decorations';
    this.scene.add(this.decorationGroup);
  }

  /** Apply decorations from event config */
  applyDecorations(config: EventConfig): void {
    this.removeDecorations(); // Clear any existing

    for (const deco of config.decorations.decorations) {
      const mesh = this.createDecoration(deco);
      if (mesh) {
        this.decorationGroup.add(mesh);
        this.activeDecorations.push({
          config: deco,
          mesh,
          animated: deco.animated,
          phaseOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    this.isActive = true;
    console.log(`[EventDecorations] Applied ${this.activeDecorations.length} decorations`);
  }

  /** Remove all event decorations */
  removeDecorations(): void {
    for (const deco of this.activeDecorations) {
      this.decorationGroup.remove(deco.mesh);
    }
    this.activeDecorations = [];
    this.isActive = false;
  }

  /** Are decorations currently active? */
  hasActiveDecorations(): boolean {
    return this.isActive && this.activeDecorations.length > 0;
  }

  /** Update animated decorations — call each frame */
  update(dt: number): void {
    if (!this.isActive) return;

    const time = performance.now() * 0.001;

    for (const deco of this.activeDecorations) {
      if (!deco.animated) continue;

      switch (deco.config.type) {
        case 'balloon':
          // Gentle bobbing
          deco.mesh.position.y = deco.config.position[1] + Math.sin(time + deco.phaseOffset) * 0.2;
          deco.mesh.rotation.y = Math.sin(time * 0.3 + deco.phaseOffset) * 0.1;
          break;
        case 'banner':
          // Subtle wave
          deco.mesh.rotation.z = Math.sin(time * 0.5 + deco.phaseOffset) * 0.05;
          break;
        case 'effect':
          // Rotation
          deco.mesh.rotation.y += dt * 0.5;
          break;
        default:
          // Generic gentle rotation
          deco.mesh.rotation.y = Math.sin(time * 0.2 + deco.phaseOffset) * 0.1;
      }
    }
  }

  /** Get decoration count */
  getDecorationCount(): number {
    return this.activeDecorations.length;
  }

  // ─── Private: Decoration Creation ──────────────────────────────────────

  private createDecoration(config: EventDecoration): THREE.Object3D | null {
    let mesh: THREE.Object3D;

    // For Part 7, use procedural geometry (GLB loading would be async)
    switch (config.type) {
      case 'banner':
        mesh = this.createBanner(config);
        break;
      case 'balloon':
        mesh = this.createBalloon(config);
        break;
      case 'stage_deco':
        mesh = this.createStageDeco(config);
        break;
      case 'signage':
        mesh = this.createSignage(config);
        break;
      case 'lighting':
        mesh = this.createLightDeco(config);
        break;
      case 'prop':
      case 'effect':
      default:
        mesh = this.createGenericProp(config);
        break;
    }

    mesh.position.set(config.position[0], config.position[1], config.position[2]);
    mesh.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
    mesh.scale.set(config.scale[0], config.scale[1], config.scale[2]);
    mesh.name = `event_deco_${config.id}`;
    mesh.userData = { isEventDecoration: true, decoId: config.id, type: config.type };

    return mesh;
  }

  private createBanner(config: EventDecoration): THREE.Group {
    const group = new THREE.Group();
    const color = config.color ?? 0x7c4dff;
    const geo = new THREE.PlaneGeometry(2, 0.8);
    const mat = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
      roughness: 0.8,
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.castShadow = true;
    group.add(plane);
    return group;
  }

  private createBalloon(config: EventDecoration): THREE.Group {
    const group = new THREE.Group();
    const color = config.color ?? 0xff4488;
    const balloonGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const balloonMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 });
    const balloon = new THREE.Mesh(balloonGeo, balloonMat);
    balloon.position.y = 0.3;
    balloon.castShadow = true;
    group.add(balloon);

    // String
    const stringGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.5, 4);
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const string = new THREE.Mesh(stringGeo, stringMat);
    group.add(string);

    return group;
  }

  private createStageDeco(config: EventDecoration): THREE.Group {
    const group = new THREE.Group();
    const color = config.color ?? 0xffdd44;
    // Simple geometric stage decoration
    const geo = new THREE.BoxGeometry(0.5, 1.5, 0.1);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);
    return group;
  }

  private createSignage(_config: EventDecoration): THREE.Group {
    const group = new THREE.Group();
    const bgGeo = new THREE.PlaneGeometry(1.5, 0.6);
    const bgMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    group.add(bg);
    // Border
    const borderGeo = new THREE.PlaneGeometry(1.6, 0.7);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x7c4dff, roughness: 0.5 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.z = -0.01;
    group.add(border);
    return group;
  }

  private createLightDeco(config: EventDecoration): THREE.Group {
    const group = new THREE.Group();
    const color = config.color ?? 0xffaa00;
    // Glowing sphere
    const geo = new THREE.SphereGeometry(0.15, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const sphere = new THREE.Mesh(geo, mat);
    group.add(sphere);
    return group;
  }

  private createGenericProp(config: EventDecoration): THREE.Group {
    const group = new THREE.Group();
    const color = config.color ?? 0xcccccc;
    const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);
    return group;
  }
}
