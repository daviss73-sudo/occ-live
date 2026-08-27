/**
 * OCC Live - Energy Wheel Controller
 * Wires the Energy Wheel UI, Reaction Renderer, and Effects together.
 * Handles the full flow: open wheel → select reaction → spawn billboard
 * + particles → sync to other players → cleanup.
 *
 * Integration points:
 * - Player UI: Q key opens wheel, HUD button also available
 * - Player position: billboard spawns above local player's avatar
 * - Multiplayer: reactions broadcast to other players via network
 * - Remote players: incoming reactions rendered at their positions
 * - Accessibility: reduced-motion disables particle effects
 * - Analytics: reaction usage tracked (aggregate, anonymous)
 *
 * Entry flow change:
 * - Physical-interaction consent screen is REMOVED
 * - Entry flow: avatar selection → world init (no consent prompt)
 * - Energy Wheel available immediately in-world via Q key
 *
 * Privacy:
 * - No names, profiles, or identity
 * - Reaction state is session-only (not persisted)
 * - No user-visible reaction history
 * - Analytics: aggregate counts only (reaction type + optional location)
 */

import * as THREE from 'three';
import { EnergyWheelUI, ENERGY_REACTIONS } from './energy-wheel-ui.ts';
import type { EnergyReaction } from './energy-wheel-ui.ts';
import { EnergyReactionRenderer } from './energy-reaction-renderer.ts';
import { EnergyReactionEffects } from './energy-reaction-effects.ts';

// ─── Multiplayer Sync Message ────────────────────────────────────────────────

export interface EnergyReactionSyncMessage {
  type: 'energy_reaction';
  sessionId: string;
  reactionId: string;
  position: [number, number, number];
  timestamp: number;
}

// ─── Controller Callbacks ────────────────────────────────────────────────────

export interface EnergyWheelControllerCallbacks {
  /** Get the local player's current world position */
  getPlayerPosition?: () => THREE.Vector3;
  /** Get the local player's session ID */
  getSessionId?: () => string | null;
  /** Broadcast a reaction to other players */
  broadcastReaction?: (message: EnergyReactionSyncMessage) => void;
  /** Track analytics (aggregate, anonymous) */
  trackReaction?: (reactionId: string, location: string | null) => void;
  /** Get current zone/location ID for location-aware effects */
  getCurrentZone?: () => string | null;
  /** Notify when wheel opens (to suppress player movement if needed) */
  onWheelOpened?: () => void;
  /** Notify when wheel closes (restore player movement) */
  onWheelClosed?: () => void;
}

// ─── Energy Wheel Controller ─────────────────────────────────────────────────

export class EnergyWheelController {
  private ui: EnergyWheelUI;
  private renderer: EnergyReactionRenderer;
  private effects: EnergyReactionEffects;
  private callbacks: EnergyWheelControllerCallbacks = {};
  private scene: THREE.Scene;

  // Rate limiting (prevent spam)
  private lastReactionTime: number = 0;
  private reactionCooldown: number = 500; // ms between reactions

  // HUD button
  private hudButton: HTMLElement | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.ui = new EnergyWheelUI();
    this.renderer = new EnergyReactionRenderer(scene);
    this.effects = new EnergyReactionEffects(scene);

    this.wireUI();
    this.createHUDButton();
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: EnergyWheelControllerCallbacks): void {
    this.callbacks = callbacks;
  }

  /** Set reduced motion (disables particles, keeps billboard) */
  setReducedMotion(enabled: boolean): void {
    this.effects.setReducedMotion(enabled);
  }

  /** Set reaction cooldown in ms */
  setReactionCooldown(ms: number): void {
    this.reactionCooldown = ms;
  }

  // ─── Update Loop ───────────────────────────────────────────────────────

  /** Call each frame from the render loop */
  update(dt: number): void {
    this.renderer.update(dt);
    this.effects.update(dt);
  }

  // ─── Remote Reactions ──────────────────────────────────────────────────

  /**
   * Handle an incoming reaction from a remote player.
   * Called when the network receives a reaction broadcast.
   */
  handleRemoteReaction(message: EnergyReactionSyncMessage): void {
    const reaction = ENERGY_REACTIONS.find(r => r.id === message.reactionId);
    if (!reaction) return;

    const position = new THREE.Vector3(
      message.position[0],
      message.position[1],
      message.position[2]
    );

    // Spawn billboard and effects at the remote player's position
    this.renderer.spawnRemote(reaction, position, message.sessionId);
    this.effects.triggerEffect(reaction, position);
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Is the wheel currently open? */
  isWheelOpen(): boolean {
    return this.ui.getIsOpen();
  }

  /** Get available reactions */
  getReactions(): EnergyReaction[] {
    return [...ENERGY_REACTIONS];
  }

  /** Get active reaction/particle counts (for performance monitoring) */
  getActiveStats(): { reactions: number; particles: number } {
    return {
      reactions: this.renderer.getActiveCount(),
      particles: this.effects.getParticleCount(),
    };
  }

  // ─── Private: Wire UI ──────────────────────────────────────────────────

  private wireUI(): void {
    this.ui.setCallbacks({
      onReactionSelected: (reaction) => {
        this.triggerLocalReaction(reaction);
      },
      onWheelOpened: () => {
        this.callbacks.onWheelOpened?.();
      },
      onWheelClosed: () => {
        this.callbacks.onWheelClosed?.();
      },
    });
  }

  // ─── Private: Trigger Reaction ─────────────────────────────────────────

  private triggerLocalReaction(reaction: EnergyReaction): void {
    // Rate limit
    const now = Date.now();
    if (now - this.lastReactionTime < this.reactionCooldown) return;
    this.lastReactionTime = now;

    // Get player position
    const position = this.callbacks.getPlayerPosition?.();
    if (!position) return;

    const sessionId = this.callbacks.getSessionId?.() ?? 'local';

    // Spawn billboard above player
    this.renderer.spawnLocal(reaction, position, sessionId);

    // Trigger particle effects
    this.effects.triggerEffect(reaction, position);

    // Broadcast to other players
    const syncMessage: EnergyReactionSyncMessage = {
      type: 'energy_reaction',
      sessionId,
      reactionId: reaction.id,
      position: [position.x, position.y, position.z],
      timestamp: now,
    };
    this.callbacks.broadcastReaction?.(syncMessage);

    // Track analytics (aggregate only — reaction type + zone, no identity)
    const zone = this.callbacks.getCurrentZone?.() ?? null;
    this.callbacks.trackReaction?.(reaction.id, zone);
  }

  // ─── Private: HUD Button ───────────────────────────────────────────────

  private createHUDButton(): void {
    const btn = document.createElement('button');
    btn.id = 'energy-wheel-btn';
    btn.setAttribute('aria-label', 'Open Energy Wheel (Q)');
    btn.title = 'Energy Wheel (Q)';
    btn.textContent = '⚡';
    btn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1a0a2e, #2d1b4e);
      border: 2px solid rgba(124, 77, 255, 0.4);
      color: #fff;
      font-size: 22px;
      cursor: pointer;
      z-index: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s, border-color 0.15s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
      btn.style.borderColor = 'rgba(124, 77, 255, 0.8)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.borderColor = 'rgba(124, 77, 255, 0.4)';
    });
    btn.addEventListener('click', () => {
      this.ui.toggle();
    });

    document.body.appendChild(btn);
    this.hudButton = btn;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  dispose(): void {
    this.ui.dispose();
    this.renderer.dispose();
    this.effects.dispose();
    if (this.hudButton) {
      this.hudButton.remove();
      this.hudButton = null;
    }
  }
}

// ─── Integration Instructions ────────────────────────────────────────────────
//
// In main.ts (or init-parts-8-12.ts), after world systems are initialized:
//
// import { EnergyWheelController } from './systems/energy-wheel-controller.ts';
//
// const energyWheel = new EnergyWheelController(scene);
// energyWheel.setCallbacks({
//   getPlayerPosition: () => playerController.getPosition(),
//   getSessionId: () => networkManager.getSessionId(),
//   broadcastReaction: (msg) => {
//     // Send via network manager to other players
//     if (networkManager.isConnected()) {
//       networkManager.sendCustomMessage(msg);
//     }
//   },
//   trackReaction: (reactionId, zone) => {
//     analytics.trackEmote(reactionId); // Reuse emote tracking
//   },
//   getCurrentZone: () => {
//     const zone = zoneManager.getPrimaryZone(playerController.getPosition());
//     return zone?.config.id ?? null;
//   },
// });
//
// // In render loop:
// energyWheel.update(dt);
//
// // Handle incoming remote reactions:
// networkManager.onCustomMessage((msg) => {
//   if (msg.type === 'energy_reaction') {
//     energyWheel.handleRemoteReaction(msg);
//   }
// });
//
// // Accessibility integration:
// accessibility.setCallbacks({
//   onReducedMotionChanged: (enabled) => {
//     energyWheel.setReducedMotion(enabled);
//   },
// });
//
// // Add to debug exports:
// window.__OCC_LIVE__.energyWheel = energyWheel;
//
// ENTRY FLOW CHANGE:
// Remove the showConsentScreen() call from the entry flow.
// Change:
//   showAvatarSelectionScreen() → showConsentScreen() → initializeWorld()
// To:
//   showAvatarSelectionScreen() → initializeWorld()
//
// Delete or empty these files:
// - src/systems/consent-screen.ts
// - src/systems/physical-interaction-trigger.ts
// - src/systems/interaction-consent-manager.ts
// - src/types/consent.ts
//
// Simplify personal-space.ts:
// - Remove the isPersonalSpaceSuspendedFor() check in enforce()
// - Always enforce personal space boundaries (no exceptions)
