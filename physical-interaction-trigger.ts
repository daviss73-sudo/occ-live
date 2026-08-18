/**
 * OCC Live - Physical Interaction Trigger
 * Handles two-player consent-gated interactions (high-five, dap, fist bump, etc).
 * Before executing any physical/proximity interaction between two players,
 * checks the InteractionConsentManager. If not mutually consented, blocks
 * silently or shows 'Interaction not available'.
 * 
 * This is separate from the single-player InteractionController which
 * handles environmental interactions (sit, roast marshmallow, etc).
 */

import * as THREE from 'three';
import type { PhysicalInteractionType, ConsentCheckResult } from '../types/consent.ts';
import type { InteractionConsentManager } from './interaction-consent-manager.ts';
import type { PersonalSpaceSystem } from './personal-space.ts';

export interface PhysicalInteractionRequest {
  interaction: PhysicalInteractionType;
  targetSessionId: string;
  localPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
}

export interface PhysicalInteractionCallback {
  onPermitted: (interaction: PhysicalInteractionType, targetSessionId: string) => void;
  onDenied: (interaction: PhysicalInteractionType, reason: string) => void;
  onComplete: (interaction: PhysicalInteractionType, targetSessionId: string) => void;
}

export class PhysicalInteractionTrigger {
  private consentManager: InteractionConsentManager;
  private personalSpaceSystem: PersonalSpaceSystem;
  private callbacks: PhysicalInteractionCallback;
  private activeInteraction: {
    interaction: PhysicalInteractionType;
    targetSessionId: string;
  } | null = null;

  constructor(
    consentManager: InteractionConsentManager,
    personalSpaceSystem: PersonalSpaceSystem,
    callbacks: PhysicalInteractionCallback
  ) {
    this.consentManager = consentManager;
    this.personalSpaceSystem = personalSpaceSystem;
    this.callbacks = callbacks;
  }

  /**
   * Attempt to initiate a physical interaction with another player.
   * Checks ALL consent conditions before allowing.
   */
  requestInteraction(request: PhysicalInteractionRequest): ConsentCheckResult {
    const distance = request.localPosition.distanceTo(request.targetPosition);

    const result = this.consentManager.checkInteraction(
      request.targetSessionId,
      request.interaction,
      distance
    );

    if (result.permitted) {
      // Begin the interaction
      this.activeInteraction = {
        interaction: request.interaction,
        targetSessionId: request.targetSessionId,
      };

      // Temporarily suspend personal space for this interaction
      this.consentManager.beginInteraction(request.interaction, request.targetSessionId);

      this.callbacks.onPermitted(request.interaction, request.targetSessionId);
    } else {
      this.callbacks.onDenied(request.interaction, result.reason);
    }

    return result;
  }

  /**
   * Complete the current active interaction.
   * Re-enables personal space immediately.
   */
  completeInteraction(): void {
    if (!this.activeInteraction) return;

    const { interaction, targetSessionId } = this.activeInteraction;

    // End the interaction — personal space re-enabled immediately
    this.consentManager.endInteraction();
    this.activeInteraction = null;

    this.callbacks.onComplete(interaction, targetSessionId);
  }

  /**
   * Cancel the current interaction (e.g. player moved away).
   */
  cancelInteraction(): void {
    if (!this.activeInteraction) return;
    this.consentManager.endInteraction();
    this.activeInteraction = null;
  }

  /** Is a physical interaction currently in progress? */
  isActive(): boolean {
    return this.activeInteraction !== null;
  }

  /** Get the active interaction details */
  getActiveInteraction(): { interaction: PhysicalInteractionType; targetSessionId: string } | null {
    return this.activeInteraction;
  }

  /**
   * Get available interactions with a specific remote player
   * (both players have consented, useful for UI prompts).
   */
  getAvailableInteractions(targetSessionId: string): PhysicalInteractionType[] {
    return this.consentManager.getMutuallyAvailableInteractions(targetSessionId);
  }

  /**
   * Check if a specific interaction is possible with a target
   * (mutual consent + range check).
   */
  canInteract(
    interaction: PhysicalInteractionType,
    targetSessionId: string,
    localPosition: THREE.Vector3,
    targetPosition: THREE.Vector3
  ): boolean {
    const distance = localPosition.distanceTo(targetPosition);
    const result = this.consentManager.checkInteraction(
      targetSessionId,
      interaction,
      distance
    );
    return result.permitted;
  }
}
