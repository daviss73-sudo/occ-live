/**
 * OCC Live - Zone Manager
 * Manages configurable world zones. Each zone has a spatial boundary,
 * interaction type, and optional visual representation.
 * Zones are data-driven — positions and properties come from config.
 */

import * as THREE from 'three';
import type { ZoneConfig, Vec3 } from '../types/index.ts';

export interface ActiveZone {
  config: ZoneConfig;
  mesh: THREE.Object3D;
  boundingSphere: THREE.Sphere;
}

export class ZoneManager {
  private zones: Map<string, ActiveZone> = new Map();
  private scene: THREE.Scene;
  private debugVisible: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Register all zones from config and create visual representations */
  registerAll(zones: ZoneConfig[]): void {
    for (const zone of zones) {
      if (zone.enabled) {
        this.register(zone);
      }
    }
  }

  /** Register a single zone */
  register(config: ZoneConfig): void {
    const mesh = this.createZoneMesh(config);
    const center = new THREE.Vector3(config.position[0], config.position[1], config.position[2]);
    const boundingSphere = new THREE.Sphere(center, config.radius);

    const activeZone: ActiveZone = { config, mesh, boundingSphere };
    this.zones.set(config.id, activeZone);
    this.scene.add(mesh);
  }

  /** Check which zone(s) a world position is inside */
  getZonesAtPosition(position: THREE.Vector3): ActiveZone[] {
    const results: ActiveZone[] = [];
    for (const zone of this.zones.values()) {
      if (zone.boundingSphere.containsPoint(position)) {
        results.push(zone);
      }
    }
    return results;
  }

  /** Get the primary (closest center) zone at a position */
  getPrimaryZone(position: THREE.Vector3): ActiveZone | null {
    let closest: ActiveZone | null = null;
    let closestDist = Infinity;

    for (const zone of this.zones.values()) {
      const dist = zone.boundingSphere.center.distanceTo(position);
      if (dist <= zone.boundingSphere.radius && dist < closestDist) {
        closest = zone;
        closestDist = dist;
      }
    }
    return closest;
  }

  /** Get a zone by ID */
  getZone(id: string): ActiveZone | undefined {
    return this.zones.get(id);
  }

  /** Get all registered zones */
  getAllZones(): ActiveZone[] {
    return Array.from(this.zones.values());
  }

  /** Get zones by type */
  getZonesByType(type: string): ActiveZone[] {
    return Array.from(this.zones.values()).filter(z => z.config.type === type);
  }

  /** Toggle debug visualization of zone boundaries */
  setDebugVisible(visible: boolean): void {
    this.debugVisible = visible;
    for (const zone of this.zones.values()) {
      zone.mesh.visible = visible;
    }
  }

  /** Update zone position at runtime */
  updatePosition(id: string, position: Vec3): void {
    const zone = this.zones.get(id);
    if (zone) {
      zone.config.position = position;
      zone.mesh.position.set(position[0], position[1], position[2]);
      zone.boundingSphere.center.set(position[0], position[1], position[2]);
    }
  }

  /** Remove a zone */
  remove(id: string): void {
    const zone = this.zones.get(id);
    if (zone) {
      this.scene.remove(zone.mesh);
      this.zones.delete(id);
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private createZoneMesh(config: ZoneConfig): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `zone_${config.id}`;
    group.userData = { zoneId: config.id, zoneType: config.type };

    // Ground circle to visualize zone boundary
    const circleGeo = new THREE.RingGeometry(config.radius - 0.1, config.radius, 32);
    const circleMat = new THREE.MeshBasicMaterial({
      color: this.getZoneColor(config.type),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.05;
    group.add(circle);

    // Fill disc
    const discGeo = new THREE.CircleGeometry(config.radius, 32);
    const discMat = new THREE.MeshBasicMaterial({
      color: this.getZoneColor(config.type),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.08,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.04;
    group.add(disc);

    // Zone label (floating text sprite)
    const label = this.createLabel(config.displayName);
    label.position.y = 3;
    group.add(label);

    group.position.set(config.position[0], config.position[1], config.position[2]);
    return group;
  }

  private createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 128;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 12);
    ctx.fill();

    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(6, 1.5, 1);
    return sprite;
  }

  private getZoneColor(type: string): number {
    const colors: Record<string, number> = {
      plaza: 0x4caf50,
      stage: 0x9c27b0,
      cafe: 0xff9800,
      relaxation: 0x8bc34a,
      recreation: 0x00bcd4,
      water: 0x2196f3,
      lounge: 0xff5722,
      portal: 0x7c4dff,
      activity: 0xffeb3b,
    };
    return colors[type] ?? 0xaaaaaa;
  }
}
