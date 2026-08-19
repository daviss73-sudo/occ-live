/**
 * OCC Live - Wayfinding System
 * Data-driven signage/directional system.
 * Labels and destinations are configured, not hard-coded into 3D models.
 * The wayfinding sign mesh will be externally provided (Meshy).
 */

import * as THREE from 'three';
import type { WayfindingEntry } from '../types/index.ts';

export class WayfindingSystem {
  private entries: WayfindingEntry[] = [];
  private signGroup: THREE.Group | null = null;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Register wayfinding entries from config */
  registerAll(entries: WayfindingEntry[]): void {
    this.entries = entries.sort((a, b) => a.order - b.order);
  }

  /** Get all wayfinding entries (sorted by order) */
  getEntries(): WayfindingEntry[] {
    return this.entries;
  }

  /** Get entry by destination ID */
  getByDestination(destinationId: string): WayfindingEntry | undefined {
    return this.entries.find(e => e.destination === destinationId);
  }

  /** Create a placeholder wayfinding sign at a world position */
  createPlaceholderSign(position: [number, number, number], rotation: [number, number, number]): void {
    this.signGroup = new THREE.Group();
    this.signGroup.name = 'wayfinding_sign';
    this.signGroup.userData = { isWayfinding: true };

    // Sign post
    const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 4, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 2;
    this.signGroup.add(post);

    // Sign boards (one per entry)
    const boardHeight = 0.4;
    const startY = 3.5;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const board = this.createSignBoard(entry, i);
      board.position.y = startY - (i * (boardHeight + 0.1));
      board.position.x = 1.2;
      this.signGroup.add(board);
    }

    this.signGroup.position.set(position[0], position[1], position[2]);
    this.signGroup.rotation.set(rotation[0], rotation[1], rotation[2]);
    this.scene.add(this.signGroup);
  }

  /** Remove placeholder sign (for when Meshy sign asset is loaded) */
  removePlaceholderSign(): void {
    if (this.signGroup) {
      this.scene.remove(this.signGroup);
      this.signGroup = null;
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private createSignBoard(entry: WayfindingEntry, index: number): THREE.Group {
    const group = new THREE.Group();

    // Board background
    const boardGeo = new THREE.BoxGeometry(2.5, 0.35, 0.1);
    const colors = [0xcc3333, 0xff6600, 0x33aa33, 0x2266cc, 0x9933cc, 0xcc6600, 0x33cccc, 0xcc33cc];
    const boardMat = new THREE.MeshStandardMaterial({
      color: colors[index % colors.length],
      roughness: 0.7,
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    group.add(board);

    // Text label
    const label = this.createTextSprite(entry.label);
    label.position.z = 0.08;
    label.scale.set(2.2, 0.35, 1);
    group.add(label);

    group.userData = { wayfindingId: entry.id, destination: entry.destination };
    return group;
  }

  private createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 48;

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(material);
  }
}
