/**
 * OCC Live - Prop Attachment System (Part 4)
 * Reusable framework for attaching/detaching props to avatar attachment points.
 * Props are loaded from GLB files and positioned relative to predefined
 * bone/anchor points on the avatar (hand_left, hand_right, head, back, hip).
 * Props do not permanently modify the avatar mesh.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Vec3 } from '../types/index.ts';
import type { AttachmentPoint, PropDefinition } from '../types/pipeline.ts';

/** Runtime state of an attached prop */
interface AttachedProp {
  definition: PropDefinition;
  mesh: THREE.Object3D;
  attachedTo: THREE.Object3D; // The avatar group or bone
}

/**
 * Default attachment offsets relative to avatar root.
 * These approximate where each attachment point is on the placeholder avatar.
 * When real rigged avatars arrive, these map to actual bone positions.
 */
const ATTACHMENT_OFFSETS: Record<AttachmentPoint, Vec3> = {
  hand_left: [-0.35, 0.85, -0.15],
  hand_right: [0.35, 0.85, -0.15],
  head: [0, 1.75, 0],
  back: [0, 1.1, 0.2],
  hip: [0, 0.7, 0],
};

export class PropAttachmentSystem {
  private loader: GLTFLoader;
  private cache: Map<string, THREE.Group> = new Map();
  private attachedProps: Map<string, AttachedProp> = new Map(); // key: `${avatarId}_${propId}`
  private registry: Map<string, PropDefinition> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  /** Register prop definitions */
  registerProps(props: PropDefinition[]): void {
    for (const prop of props) {
      this.registry.set(prop.id, prop);
    }
  }

  /** Register a single prop */
  registerProp(prop: PropDefinition): void {
    this.registry.set(prop.id, prop);
  }

  /** Get a prop definition by ID */
  getPropDef(id: string): PropDefinition | undefined {
    return this.registry.get(id);
  }

  /**
   * Attach a prop to an avatar.
   * @param propId - The registered prop ID
   * @param avatarGroup - The avatar THREE.Group to attach to
   * @param avatarId - Unique identifier for the avatar (sessionId or npc id)
   * @returns The attached mesh, or null if loading failed
   */
  async attach(propId: string, avatarGroup: THREE.Group, avatarId: string): Promise<THREE.Object3D | null> {
    const def = this.registry.get(propId);
    if (!def) {
      console.warn(`[PropAttachment] Unknown prop: ${propId}`);
      return null;
    }

    // Already attached?
    const key = `${avatarId}_${propId}`;
    if (this.attachedProps.has(key)) {
      return this.attachedProps.get(key)!.mesh;
    }

    // Load or get from cache
    let mesh: THREE.Object3D;
    const cached = this.cache.get(def.file);
    if (cached) {
      mesh = cached.clone();
    } else {
      try {
        const gltf = await this.loader.loadAsync(def.file);
        this.cache.set(def.file, gltf.scene.clone() as THREE.Group);
        mesh = gltf.scene;
      } catch (error) {
        // Fallback: create a simple placeholder prop
        mesh = this.createPlaceholderProp(def);
      }
    }

    // Apply prop-specific transform
    mesh.position.set(def.offset[0], def.offset[1], def.offset[2]);
    mesh.rotation.set(def.rotation[0], def.rotation[1], def.rotation[2]);
    mesh.scale.set(def.scale[0], def.scale[1], def.scale[2]);
    mesh.name = `prop_${propId}`;
    mesh.userData = { isProp: true, propId };

    // Find attachment target on avatar
    const target = this.findAttachmentTarget(avatarGroup, def.attachPoint);

    // Attach to target
    target.add(mesh);

    this.attachedProps.set(key, {
      definition: def,
      mesh,
      attachedTo: target,
    });

    return mesh;
  }

  /**
   * Attach a prop using placeholder geometry (no async loading needed).
   * Used for the marshmallow stick and similar simple props.
   */
  attachPlaceholder(propId: string, avatarGroup: THREE.Group, avatarId: string, mesh: THREE.Group): void {
    const key = `${avatarId}_${propId}`;
    if (this.attachedProps.has(key)) return;

    const def = this.registry.get(propId);
    const attachPoint: AttachmentPoint = def?.attachPoint ?? 'hand_right';
    const target = this.findAttachmentTarget(avatarGroup, attachPoint);

    target.add(mesh);

    this.attachedProps.set(key, {
      definition: def ?? { id: propId, file: '', attachPoint, offset: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      mesh,
      attachedTo: target,
    });
  }

  /**
   * Detach a prop from an avatar.
   */
  detach(propId: string, avatarId: string): void {
    const key = `${avatarId}_${propId}`;
    const attached = this.attachedProps.get(key);
    if (!attached) return;

    attached.attachedTo.remove(attached.mesh);
    this.attachedProps.delete(key);
  }

  /** Detach all props from an avatar */
  detachAll(avatarId: string): void {
    const keysToRemove: string[] = [];
    for (const [key, attached] of this.attachedProps) {
      if (key.startsWith(`${avatarId}_`)) {
        attached.attachedTo.remove(attached.mesh);
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      this.attachedProps.delete(key);
    }
  }

  /** Check if a prop is currently attached to an avatar */
  isAttached(propId: string, avatarId: string): boolean {
    return this.attachedProps.has(`${avatarId}_${propId}`);
  }

  /** Get all props attached to an avatar */
  getAttachedProps(avatarId: string): PropDefinition[] {
    const result: PropDefinition[] = [];
    for (const [key, attached] of this.attachedProps) {
      if (key.startsWith(`${avatarId}_`)) {
        result.push(attached.definition);
      }
    }
    return result;
  }

  /** Clear cache */
  clearCache(): void {
    this.cache.clear();
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private findAttachmentTarget(avatarGroup: THREE.Group, point: AttachmentPoint): THREE.Object3D {
    // Try to find a named bone/group in the avatar
    const boneName = `attach_${point}`;
    const bone = avatarGroup.getObjectByName(boneName);
    if (bone) return bone;

    // Fallback: create an anchor at the default offset position
    let anchor = avatarGroup.getObjectByName(`__anchor_${point}`);
    if (!anchor) {
      anchor = new THREE.Group();
      anchor.name = `__anchor_${point}`;
      const offset = ATTACHMENT_OFFSETS[point];
      anchor.position.set(offset[0], offset[1], offset[2]);
      avatarGroup.add(anchor);
    }
    return anchor;
  }

  private createPlaceholderProp(def: PropDefinition): THREE.Object3D {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.3);
    const mat = new THREE.MeshStandardMaterial({ color: 0xcc8844, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    group.name = `prop_placeholder_${def.id}`;
    return group;
  }
}
