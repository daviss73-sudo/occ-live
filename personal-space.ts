/**
 * OCC Live - Personal Space Boundary System
 * 
 * Every avatar has an enforced minimum personal-space boundary.
 * Normal movement cannot allow one avatar to enter another's boundary.
 * Uses collision geometry (sphere) rather than visible avatar position.
 * 
 * Exception: temporarily suspended during an approved interaction
 * (checked via InteractionConsentManager).
 */

import * as THREE from 'three';
import type { PersonalSpaceConfig } from '../types/consent.ts';
import type { InteractionConsentManager } from './interaction-consent-manager.ts';

interface TrackedAvatar {
  sessionId: string;
  position: THREE.Vector3;
  radius: number;
}

export class PersonalSpaceSystem {
  private config: PersonalSpaceConfig;
  private consentManager: InteractionConsentManager;
  private remoteAvatars: Map<string, TrackedAvatar> = new Map();

  constructor(config: PersonalSpaceConfig, consentManager: InteractionConsentManager) {
    this.config = config;
    this.consentManager = consentManager;
  }

  /** Register or update a remote avatar's position */
  updateRemoteAvatar(sessionId: string, position: THREE.Vector3): void {
    const existing = this.remoteAvatars.get(sessionId);
    if (existing) {
      existing.position.copy(position);
    } else {
      this.remoteAvatars.set(sessionId, {
        sessionId,
        position: position.clone(),
        radius: this.config.radius,
      });
    }
  }

  /** Remove a remote avatar from tracking */
  removeRemoteAvatar(sessionId: string): void {
    this.remoteAvatars.delete(sessionId);
  }

  /**
   * Enforce personal space for the local player.
   * Call each frame with the local player's current position.
   * Returns the corrected position (pushed out of any boundaries).
   */
  enforce(localPosition: THREE.Vector3): THREE.Vector3 {
    const corrected = localPosition.clone();
    const localRadius = this.config.radius;

    for (const remote of this.remoteAvatars.values()) {
      // Skip if personal space is suspended for an active approved interaction
      if (this.consentManager.isPersonalSpaceSuspendedFor(remote.sessionId)) {
        continue;
      }

      const toLocal = corrected.clone().sub(remote.position);
      toLocal.y = 0; // Only enforce on XZ plane (don't push vertically)

      const distance = toLocal.length();
      const minDistance = localRadius + remote.radius;

      if (distance < minDistance && distance > 0.001) {
        // Push local player out of remote's boundary
        const pushDirection = toLocal.normalize();
        const overlap = minDistance - distance;
        const pushAmount = overlap * this.config.pushForce;

        corrected.x += pushDirection.x * pushAmount;
        corrected.z += pushDirection.z * pushAmount;
      } else if (distance <= 0.001) {
        // Avatars at exact same position — push in arbitrary direction
        corrected.x += this.config.radius;
      }
    }

    return corrected;
  }

  /**
   * Check if moving to a target position would violate personal space.
   * Returns true if the move is blocked.
   */
  wouldViolate(targetPosition: THREE.Vector3): boolean {
    const localRadius = this.config.radius;

    for (const remote of this.remoteAvatars.values()) {
      if (this.consentManager.isPersonalSpaceSuspendedFor(remote.sessionId)) {
        continue;
      }

      const toTarget = targetPosition.clone().sub(remote.position);
      toTarget.y = 0;

      const distance = toTarget.length();
      const minDistance = localRadius + remote.radius;

      if (distance < minDistance) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the closest remote avatar and distance (for UI/interaction hints).
   */
  getClosestRemote(localPosition: THREE.Vector3): { sessionId: string; distance: number } | null {
    let closest: { sessionId: string; distance: number } | null = null;

    for (const remote of this.remoteAvatars.values()) {
      const dist = localPosition.distanceTo(remote.position);
      if (!closest || dist < closest.distance) {
        closest = { sessionId: remote.sessionId, distance: dist };
      }
    }

    return closest;
  }

  /** Get personal space radius */
  getRadius(): number {
    return this.config.radius;
  }

  /** Clear all tracked avatars */
  clear(): void {
    this.remoteAvatars.clear();
  }
}
