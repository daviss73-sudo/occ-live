/**
 * OCC Live - District Registry & Portal System
 * Manages district states and portal interactions.
 * Districts can exist in the app without being accessible.
 * Only Main Union is loaded; others are COMING_SOON placeholders.
 */

import * as THREE from 'three';
import type { DistrictConfig, DistrictStatus, ZoneConfig } from '../types/index.ts';

export class DistrictRegistry {
  private districts: Map<string, DistrictConfig> = new Map();
  private portalMeshes: Map<string, THREE.Object3D> = new Map();
  private scene: THREE.Scene;
  private onPortalAttempt: ((district: DistrictConfig) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Register all districts from config */
  registerAll(districts: DistrictConfig[]): void {
    for (const district of districts) {
      this.districts.set(district.id, district);
    }
  }

  /** Get a district by ID */
  getDistrict(id: string): DistrictConfig | undefined {
    return this.districts.get(id);
  }

  /** Get all districts */
  getAllDistricts(): DistrictConfig[] {
    return Array.from(this.districts.values());
  }

  /** Get districts by status */
  getByStatus(status: DistrictStatus): DistrictConfig[] {
    return Array.from(this.districts.values()).filter(d => d.status === status);
  }

  /** Update a district's status */
  setStatus(id: string, status: DistrictStatus): void {
    const district = this.districts.get(id);
    if (district) {
      district.status = status;
      this.updatePortalVisual(id);
    }
  }

  /** Check if a district is accessible */
  isAccessible(id: string): boolean {
    const district = this.districts.get(id);
    return district?.status === 'OPEN';
  }

  /** Attempt to enter a district via portal */
  attemptEntry(districtId: string): { success: boolean; message: string } {
    const district = this.districts.get(districtId);
    if (!district) {
      return { success: false, message: 'Unknown district.' };
    }

    switch (district.status) {
      case 'OPEN':
        if (this.onPortalAttempt) {
          this.onPortalAttempt(district);
        }
        return { success: true, message: `Entering ${district.name}...` };
      case 'CLOSED':
        return { success: false, message: `${district.name} is currently closed.` };
      case 'COMING_SOON':
        return { success: false, message: `${district.name} — Coming Soon` };
      case 'EVENT_ONLY':
        return { success: false, message: `${district.name} is only available during events.` };
      default:
        return { success: false, message: 'Cannot enter this district.' };
    }
  }

  /** Set callback for portal entry attempts (used for scene loading) */
  onPortalEntry(callback: (district: DistrictConfig) => void): void {
    this.onPortalAttempt = callback;
  }

  /** Create portal placeholder visuals from zone config */
  createPortalVisuals(portalZones: ZoneConfig[]): void {
    for (const zone of portalZones) {
      if (zone.type !== 'portal' || !zone.districtId) continue;

      const district = this.districts.get(zone.districtId);
      if (!district) continue;

      const portal = this.createPortalMesh(zone, district);
      this.portalMeshes.set(zone.id, portal);
      this.scene.add(portal);
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private createPortalMesh(zone: ZoneConfig, district: DistrictConfig): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `portal_${zone.id}`;
    group.userData = { zoneId: zone.id, districtId: district.id, isPortal: true };

    // Portal archway (placeholder stone arch)
    const archGeo = new THREE.TorusGeometry(2.5, 0.4, 8, 16, Math.PI);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
    });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.y = 2.5;
    group.add(arch);

    // Portal pillars
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.5, 5, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 });

    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-2.5, 2.5, 0);
    group.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(2.5, 2.5, 0);
    group.add(rightPillar);

    // Portal surface (glowing energy)
    const portalGeo = new THREE.CircleGeometry(2.2, 32);
    const portalColor = district.status === 'OPEN' ? 0x7c4dff : 0x555555;
    const portalMat = new THREE.MeshBasicMaterial({
      color: portalColor,
      transparent: true,
      opacity: district.status === 'OPEN' ? 0.7 : 0.3,
      side: THREE.DoubleSide,
    });
    const portalSurface = new THREE.Mesh(portalGeo, portalMat);
    portalSurface.position.y = 2.8;
    portalSurface.name = 'portal_surface';
    group.add(portalSurface);

    // District name label
    const label = this.createPortalLabel(district);
    label.position.y = 5.5;
    group.add(label);

    // Status indicator
    if (district.status !== 'OPEN') {
      const statusLabel = this.createStatusLabel(district.status);
      statusLabel.position.y = 1;
      group.add(statusLabel);
    }

    group.position.set(zone.position[0], zone.position[1], zone.position[2]);
    group.rotation.set(zone.rotation[0], zone.rotation[1], zone.rotation[2]);

    return group;
  }

  private createPortalLabel(district: DistrictConfig): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 128;

    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(district.name, canvas.width / 2, canvas.height / 2);
    ctx.fillText(district.name, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(5, 1.25, 1);
    return sprite;
  }

  private createStatusLabel(status: DistrictStatus): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    const text = status === 'COMING_SOON' ? 'Coming Soon'
      : status === 'CLOSED' ? 'Closed'
      : status === 'EVENT_ONLY' ? 'Event Only'
      : '';

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 8);
    ctx.fill();

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffcc00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 0.75, 1);
    return sprite;
  }

  private updatePortalVisual(districtId: string): void {
    // Find portal mesh for this district and update its appearance
    for (const [, mesh] of this.portalMeshes) {
      if (mesh.userData.districtId === districtId) {
        const surface = mesh.getObjectByName('portal_surface') as THREE.Mesh | undefined;
        if (surface) {
          const district = this.districts.get(districtId)!;
          const mat = surface.material as THREE.MeshBasicMaterial;
          mat.color.setHex(district.status === 'OPEN' ? 0x7c4dff : 0x555555);
          mat.opacity = district.status === 'OPEN' ? 0.7 : 0.3;
        }
      }
    }
  }
}
