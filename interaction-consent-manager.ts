/**
 * OCC Live - Interaction Consent Manager (Centralized Safety System)
 * 
 * Every physical/proximity interaction must ask this manager:
 *   1. Does Player A consent to THIS interaction?
 *   2. Does Player B consent to THIS interaction?
 *   3. Is this interaction currently permitted?
 *   4. Are both players within the appropriate interaction range?
 * 
 * Only if ALL conditions are satisfied does the interaction execute.
 * 
 * Preferences are session-locked: once the player enters OCC Live,
 * preferences become read-only. No hidden shortcut, console command,
 * URL parameter, or client-side state change can bypass this.
 */

import type {
  PhysicalInteractionType,
  ConsentPreferences,
  ConsentState,
  ConsentCheckResult,
  PersonalSpaceConfig,
} from '../types/consent.ts';
import { createDefaultConsentPreferences } from '../types/consent.ts';

/** Interaction range requirements (world units) */
const INTERACTION_RANGES: Record<PhysicalInteractionType, number> = {
  high_five: 2.0,
  dap: 2.0,
  frisbee_catch: 15.0,
};

export class InteractionConsentManager {
  /** Local player's consent state */
  private localConsent: ConsentState;

  /** Remote players' consent preferences (synced via multiplayer) */
  private remoteConsents: Map<string, ConsentPreferences> = new Map();

  /** Personal space configuration */
  private personalSpace: PersonalSpaceConfig;

  /** Whether an approved interaction is currently in progress (suspends personal space) */
  private activeInteraction: {
    interactionType: PhysicalInteractionType;
    withPlayer: string;
  } | null = null;

  constructor(personalSpaceConfig: PersonalSpaceConfig) {
    this.localConsent = {
      preferences: createDefaultConsentPreferences(),
      locked: false,
      timestamp: 0,
    };
    this.personalSpace = personalSpaceConfig;
  }

  // ─── Local Player Consent ──────────────────────────────────────────────

  /** Set a consent preference (only allowed before entry / before lock) */
  setPreference(interaction: PhysicalInteractionType, consented: boolean): boolean {
    if (this.localConsent.locked) {
      console.warn('[ConsentManager] Preferences are locked. Cannot change after entry.');
      return false;
    }
    this.localConsent.preferences[interaction] = consented;
    return true;
  }

  /** Set all preferences at once (only before lock) */
  setAllPreferences(preferences: ConsentPreferences): boolean {
    if (this.localConsent.locked) {
      console.warn('[ConsentManager] Preferences are locked. Cannot change after entry.');
      return false;
    }
    this.localConsent.preferences = { ...preferences };
    return true;
  }

  /** Lock preferences — called when player clicks ENTER OCC LIVE */
  lockPreferences(): void {
    this.localConsent.locked = true;
    this.localConsent.timestamp = Date.now();
    // Freeze the object to prevent any runtime tampering
    Object.freeze(this.localConsent.preferences);
  }

  /** Are preferences locked? */
  arePreferencesLocked(): boolean {
    return this.localConsent.locked;
  }

  /** Get the local player's consent preferences (read-only copy) */
  getLocalPreferences(): ConsentPreferences {
    return { ...this.localConsent.preferences };
  }

  /** Get the full consent state */
  getLocalConsentState(): ConsentState {
    return { ...this.localConsent, preferences: { ...this.localConsent.preferences } };
  }

  /** Does the local player consent to a specific interaction? */
  doesLocalPlayerConsent(interaction: PhysicalInteractionType): boolean {
    return this.localConsent.preferences[interaction] === true;
  }

  // ─── Remote Player Consent ─────────────────────────────────────────────

  /** Register a remote player's consent preferences */
  setRemotePlayerConsent(sessionId: string, preferences: ConsentPreferences): void {
    this.remoteConsents.set(sessionId, { ...preferences });
  }

  /** Remove a remote player's consent data (on leave/disconnect) */
  removeRemotePlayer(sessionId: string): void {
    this.remoteConsents.delete(sessionId);
  }

  /** Does a specific remote player consent to an interaction? */
  doesRemotePlayerConsent(sessionId: string, interaction: PhysicalInteractionType): boolean {
    const prefs = this.remoteConsents.get(sessionId);
    if (!prefs) return false;
    return prefs[interaction] === true;
  }

  /** Get a remote player's preferences */
  getRemotePlayerPreferences(sessionId: string): ConsentPreferences | null {
    return this.remoteConsents.get(sessionId) ?? null;
  }

  // ─── Two-Player Consent Check ──────────────────────────────────────────

  /**
   * The core safety check. Evaluates whether an interaction between
   * the local player and a remote player is permitted.
   * Both players must have explicitly opted into the SPECIFIC interaction.
   */
  checkInteraction(
    remoteSessionId: string,
    interaction: PhysicalInteractionType,
    distance: number
  ): ConsentCheckResult {
    const playerAConsents = this.doesLocalPlayerConsent(interaction);
    const playerBConsents = this.doesRemotePlayerConsent(remoteSessionId, interaction);

    // Both must consent
    if (!playerAConsents) {
      return {
        permitted: false,
        reason: 'You have not consented to this interaction.',
        playerAConsents,
        playerBConsents,
      };
    }

    if (!playerBConsents) {
      return {
        permitted: false,
        reason: 'The other player has not consented to this interaction.',
        playerAConsents,
        playerBConsents,
      };
    }

    // Range check
    const requiredRange = INTERACTION_RANGES[interaction];
    if (distance > requiredRange) {
      return {
        permitted: false,
        reason: 'Too far away for this interaction.',
        playerAConsents,
        playerBConsents,
      };
    }

    // All conditions satisfied
    return {
      permitted: true,
      reason: 'Interaction permitted.',
      playerAConsents,
      playerBConsents,
    };
  }

  /**
   * Quick check: is a specific interaction mutually consented
   * (ignoring range — useful for UI hints)?
   */
  isMutuallyConsented(remoteSessionId: string, interaction: PhysicalInteractionType): boolean {
    return this.doesLocalPlayerConsent(interaction) &&
           this.doesRemotePlayerConsent(remoteSessionId, interaction);
  }

  // ─── Active Interaction (Personal Space Exception) ─────────────────────

  /** Begin an approved interaction (temporarily suspends personal space) */
  beginInteraction(interaction: PhysicalInteractionType, withPlayer: string): void {
    this.activeInteraction = { interactionType: interaction, withPlayer };
  }

  /** End the current active interaction (re-enables personal space) */
  endInteraction(): void {
    this.activeInteraction = null;
  }

  /** Is there an active interaction with a specific player? */
  hasActiveInteractionWith(sessionId: string): boolean {
    return this.activeInteraction?.withPlayer === sessionId;
  }

  /** Is personal space currently overridden for a specific player? */
  isPersonalSpaceSuspendedFor(sessionId: string): boolean {
    return this.activeInteraction?.withPlayer === sessionId;
  }

  // ─── Personal Space ────────────────────────────────────────────────────

  /** Get the personal space radius */
  getPersonalSpaceRadius(): number {
    return this.personalSpace.radius;
  }

  /** Get the push force for personal space enforcement */
  getPushForce(): number {
    return this.personalSpace.pushForce;
  }

  /** Get full personal space config */
  getPersonalSpaceConfig(): PersonalSpaceConfig {
    return { ...this.personalSpace };
  }

  // ─── Utility ───────────────────────────────────────────────────────────

  /** Get all interactions the local player has consented to */
  getLocalConsentedInteractions(): PhysicalInteractionType[] {
    const result: PhysicalInteractionType[] = [];
    for (const [interaction, consented] of Object.entries(this.localConsent.preferences)) {
      if (consented) {
        result.push(interaction as PhysicalInteractionType);
      }
    }
    return result;
  }

  /** Get interactions mutually available with a specific remote player */
  getMutuallyAvailableInteractions(remoteSessionId: string): PhysicalInteractionType[] {
    const result: PhysicalInteractionType[] = [];
    const remotePrefs = this.remoteConsents.get(remoteSessionId);
    if (!remotePrefs) return result;

    for (const [interaction, localConsented] of Object.entries(this.localConsent.preferences)) {
      if (localConsented && remotePrefs[interaction as PhysicalInteractionType]) {
        result.push(interaction as PhysicalInteractionType);
      }
    }
    return result;
  }

  /** Clear all remote player data */
  clearRemotePlayers(): void {
    this.remoteConsents.clear();
  }

  /** Get required range for an interaction */
  getInteractionRange(interaction: PhysicalInteractionType): number {
    return INTERACTION_RANGES[interaction];
  }
}
