/**
 * OCC Live - Player Controller (Part 2 Updated)
 * Third-person player controller with WASD movement, jump, gravity,
 * ground detection, and configurable camera follow.
 * Now accepts an external avatar mesh and exposes movement state
 * for the animation system.
 */

import * as THREE from 'three';
import type { PlayerConfig, CameraConfig, Vec3 } from '../types/index.ts';
import type { PlayerMovementState, MobilityType } from '../types/avatar.ts';
import type { PersonalSpaceSystem } from './personal-space.ts';

export class PlayerController {
  // Player state
  private position: THREE.Vector3;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private isGrounded: boolean = true;
  private isRunning: boolean = false;
  private isMoving: boolean = false;

  // Visual
  private mesh: THREE.Group;
  private scene: THREE.Scene;

  // Camera
  private camera: THREE.PerspectiveCamera;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3();
  private cameraAngleH: number = 0;
  private cameraAngleV: number = 0.6;
  private cameraDistance: number;

  // Config
  private playerConfig: PlayerConfig;
  private cameraConfig: CameraConfig;

  // Input state
  private keys: Set<string> = new Set();
  private mouseDown: boolean = false;
  private mouseDeltaX: number = 0;
  private mouseDeltaY: number = 0;

  // Ground plane Y
  private groundY: number = 0;

  // Personal space (optional — set after construction)
  private personalSpaceSystem: PersonalSpaceSystem | null = null;

  // Mobility type (walking or wheelchair)
  private mobilityType: MobilityType = 'walking';

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    playerConfig: PlayerConfig,
    cameraConfig: CameraConfig,
    spawnPosition: Vec3,
    avatarMesh?: THREE.Group
  ) {
    this.scene = scene;
    this.camera = camera;
    this.playerConfig = playerConfig;
    this.cameraConfig = cameraConfig;
    this.cameraDistance = cameraConfig.distance;

    this.position = new THREE.Vector3(
      spawnPosition[0], spawnPosition[1], spawnPosition[2]
    );

    // Use provided avatar mesh or fallback to basic placeholder
    this.mesh = avatarMesh ?? this.createFallbackMesh();
    this.mesh.position.copy(this.position);
    this.mesh.userData.isPlayer = true;
    this.scene.add(this.mesh);

    this.setupInput();
    this.updateCamera(0);
  }

  /** Get current player world position */
  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  /** Get the player mesh (for external systems to reference) */
  getMesh(): THREE.Group {
    return this.mesh;
  }

  /** Replace the current avatar mesh with a new one */
  setAvatarMesh(newMesh: THREE.Group): void {
    const oldPos = this.mesh.position.clone();
    const oldRot = this.mesh.rotation.y;
    this.scene.remove(this.mesh);
    this.mesh = newMesh;
    this.mesh.position.copy(oldPos);
    this.mesh.rotation.y = oldRot;
    this.mesh.userData.isPlayer = true;
    this.scene.add(this.mesh);
  }

  /** Teleport player to a position */
  teleportTo(pos: Vec3): void {
    this.position.set(pos[0], pos[1], pos[2]);
    this.mesh.position.copy(this.position);
    this.velocity.set(0, 0, 0);
  }

  /** Get current movement state (for animation system) */
  getMovementState(): PlayerMovementState {
    return {
      isMoving: this.isMoving,
      isRunning: this.isRunning,
      isRolling: this.mobilityType === 'wheelchair' && this.isMoving,
      isGrounded: this.isGrounded,
      isJumping: !this.isGrounded && this.velocity.y > 0,
      isFalling: !this.isGrounded && this.velocity.y <= 0,
      velocity: [this.velocity.x, this.velocity.y, this.velocity.z],
      speed: this.isMoving
        ? (this.isRunning ? this.playerConfig.runSpeed : this.playerConfig.walkSpeed)
        : 0,
    };
  }

  /** Check if player is currently providing movement input */
  hasMovementInput(): boolean {
    return this.keys.has('w') || this.keys.has('a') ||
           this.keys.has('s') || this.keys.has('d') ||
           this.keys.has('arrowup') || this.keys.has('arrowdown') ||
           this.keys.has('arrowleft') || this.keys.has('arrowright');
  }

  /** Attach personal space system for boundary enforcement */
  setPersonalSpaceSystem(system: PersonalSpaceSystem): void {
    this.personalSpaceSystem = system;
  }

  /** Set the avatar's mobility type (affects movement animations) */
  setMobilityType(type: MobilityType): void {
    this.mobilityType = type;
  }

  /** Get the current mobility type */
  getMobilityType(): MobilityType {
    return this.mobilityType;
  }

  /** Main update loop — call each frame */
  update(deltaTime: number): void {
    this.handleMovement(deltaTime);
    this.handleGravity(deltaTime);
    this.handleGroundDetection();

    // Enforce personal space boundaries (pushes out of other avatars)
    if (this.personalSpaceSystem) {
      const corrected = this.personalSpaceSystem.enforce(this.position);
      this.position.x = corrected.x;
      this.position.z = corrected.z;
    }

    this.mesh.position.copy(this.position);
    this.updateCamera(deltaTime);
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }

  /** Clean up event listeners */
  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('wheel', this.onWheel);
    this.scene.remove(this.mesh);
  }

  // ─── Movement ──────────────────────────────────────────────────────────

  private handleMovement(dt: number): void {
    const speed = this.isRunning
      ? this.playerConfig.runSpeed
      : this.playerConfig.walkSpeed;
    const direction = new THREE.Vector3();

    // Calculate forward/right relative to camera angle
    const forward = new THREE.Vector3(
      -Math.sin(this.cameraAngleH),
      0,
      -Math.cos(this.cameraAngleH)
    ).normalize();

    const right = new THREE.Vector3(
      Math.cos(this.cameraAngleH),
      0,
      -Math.sin(this.cameraAngleH)
    ).normalize();

    if (this.keys.has('w') || this.keys.has('arrowup')) direction.add(forward);
    if (this.keys.has('s') || this.keys.has('arrowdown')) direction.sub(forward);
    if (this.keys.has('a') || this.keys.has('arrowleft')) direction.sub(right);
    if (this.keys.has('d') || this.keys.has('arrowright')) direction.add(right);

    if (direction.lengthSq() > 0) {
      direction.normalize();
      this.position.x += direction.x * speed * dt;
      this.position.z += direction.z * speed * dt;

      // Rotate player to face movement direction
      const targetAngle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = targetAngle;
      this.isMoving = true;
    } else {
      this.isMoving = false;
    }

    // Jump
    if ((this.keys.has(' ') || this.keys.has('space')) && this.isGrounded) {
      this.velocity.y = this.playerConfig.jumpForce;
      this.isGrounded = false;
    }
  }

  private handleGravity(dt: number): void {
    if (!this.isGrounded) {
      this.velocity.y -= this.playerConfig.gravity * dt;
      this.position.y += this.velocity.y * dt;
    }
  }

  private handleGroundDetection(): void {
    if (this.position.y <= this.groundY) {
      this.position.y = this.groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    }
  }

  // ─── Camera ────────────────────────────────────────────────────────────

  private updateCamera(dt: number): void {
    if (this.mouseDown) {
      this.cameraAngleH += this.mouseDeltaX * this.cameraConfig.rotationSpeed;
      this.cameraAngleV -= this.mouseDeltaY * this.cameraConfig.rotationSpeed;
      this.cameraAngleV = THREE.MathUtils.clamp(
        this.cameraAngleV,
        this.cameraConfig.minPolarAngle,
        this.cameraConfig.maxPolarAngle
      );
    }

    const offsetX = Math.sin(this.cameraAngleH) *
      Math.cos(this.cameraAngleV) * this.cameraDistance;
    const offsetY = Math.sin(this.cameraAngleV) * this.cameraDistance;
    const offsetZ = Math.cos(this.cameraAngleH) *
      Math.cos(this.cameraAngleV) * this.cameraDistance;

    const targetPos = new THREE.Vector3(
      this.position.x + offsetX,
      this.position.y + this.playerConfig.height + offsetY,
      this.position.z + offsetZ
    );

    const smoothing = dt > 0
      ? 1 - Math.pow(1 - this.cameraConfig.smoothing, dt * 60)
      : 1;
    this.camera.position.lerp(targetPos, smoothing);

    this.cameraTarget.set(
      this.position.x,
      this.position.y + this.playerConfig.height * 0.7,
      this.position.z
    );
    this.camera.lookAt(this.cameraTarget);
  }

  // ─── Input ─────────────────────────────────────────────────────────────

  private setupInput(): void {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('wheel', this.onWheel);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.keys.add(key);
    if (key === 'shift') this.isRunning = true;
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.keys.delete(key);
    if (key === 'shift') this.isRunning = false;
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 2 || e.button === 1) {
      this.mouseDown = true;
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 2 || e.button === 1) {
      this.mouseDown = false;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseDeltaX = e.movementX;
    this.mouseDeltaY = e.movementY;
  };

  private onWheel = (e: WheelEvent): void => {
    this.cameraDistance += e.deltaY * 0.01;
    this.cameraDistance = THREE.MathUtils.clamp(
      this.cameraDistance,
      this.cameraConfig.minDistance,
      this.cameraConfig.maxDistance
    );
  };

  // ─── Fallback Mesh (used only if no avatar provided) ──────────────────

  private createFallbackMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'player_fallback';

    const bodyGeo = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x4488cc, roughness: 0.6,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffcc88, roughness: 0.5,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.75;
    group.add(head);

    return group;
  }
}
