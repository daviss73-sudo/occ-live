/**
 * OCC Live - Shared Activity System (Part 9)
 * Allows multiple players to participate in compatible activities
 * without forcing interaction, physical contact, or proximity violation.
 *
 * Design principles:
 * - Players must explicitly choose to join (no auto-join on proximity)
 * - Players can always leave at any time (freeExit: true by default)
 * - Physical contact activities check consent via InteractionConsentManager
 * - No player is forced into an activity or physical contact
 * - State is synced for nearby players to see
 * - No personal information displayed
 *
 * Supported activity types:
 * - dance_floor: Multiple players dance simultaneously (no contact)
 * - sitting_area: Multiple players sit near each other (no contact)
 * - firepit: Multiple players sit at firepit (no contact)
 * - lazy_river: Multiple players float in river (no contact)
 * - ball_pit: Multiple players play in ball pit (no contact)
 * - mini_game: Multiplayer game sessions
 * - photobooth: Queue-based group activity (separate system)
 * - custom: Generic shared activity
 */

import type { SharedActivityConfig, Vec3 } from '../types/index.ts';

// ─── Participant State ───────────────────────────────────────────────────────

export interface ActivityParticipant {
  sessionId: string;
  joinedAt: number;
  animation: string | null;
  /** Position within the activity (e.g., seat slot) */
  slotIndex: number | null;
}

// ─── Activity Instance ───────────────────────────────────────────────────────

export interface SharedActivityInstance {
  config: SharedActivityConfig;
  participants: Map<string, ActivityParticipant>;
  isActive: boolean;
  startedAt: number;
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface SharedActivityCallbacks {
  onPlayerJoined?: (activityId: string, sessionId: string, participantCount: number) => void;
  onPlayerLeft?: (activityId: string, sessionId: string, participantCount: number) => void;
  onActivityFull?: (activityId: string, sessionId: string) => void;
  onActivityStarted?: (activityId: string) => void;
  onActivityEnded?: (activityId: string) => void;
}

// ─── Shared Activity System ──────────────────────────────────────────────────

export class SharedActivitySystem {
  private activities: Map<string, SharedActivityInstance> = new Map();
  private playerActivities: Map<string, string> = new Map(); // sessionId → activityId
  private callbacks: SharedActivityCallbacks = {};
  private consentChecker: ((sessionId: string, interaction: string) => boolean) | null = null;

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: SharedActivityCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Set the consent checker function.
   * Used to verify physical-contact consent before allowing join
   * on activities that require it.
   */
  setConsentChecker(checker: (sessionId: string, interaction: string) => boolean): void {
    this.consentChecker = checker;
  }

  // ─── Registration ──────────────────────────────────────────────────────

  /** Register a shared activity from config */
  registerActivity(config: SharedActivityConfig): void {
    if (this.activities.has(config.id)) return;

    this.activities.set(config.id, {
      config,
      participants: new Map(),
      isActive: true,
      startedAt: Date.now(),
    });
  }

  /** Register multiple activities from config array */
  registerAll(configs: SharedActivityConfig[]): void {
    for (const config of configs) {
      this.registerActivity(config);
    }
  }

  /** Unregister an activity */
  unregisterActivity(activityId: string): void {
    const instance = this.activities.get(activityId);
    if (!instance) return;

    // Remove all participants first
    for (const sessionId of instance.participants.keys()) {
      this.leaveActivity(sessionId);
    }

    this.activities.delete(activityId);
  }

  // ─── Player Actions ────────────────────────────────────────────────────

  /**
   * Player explicitly joins a shared activity.
   * Returns true if successfully joined.
   */
  joinActivity(activityId: string, sessionId: string): boolean {
    const instance = this.activities.get(activityId);
    if (!instance) return false;
    if (!instance.isActive) return false;
    if (!instance.config.enabled) return false;

    // Already in this activity
    if (instance.participants.has(sessionId)) return true;

    // Already in another activity — leave it first
    const currentActivity = this.playerActivities.get(sessionId);
    if (currentActivity && currentActivity !== activityId) {
      this.leaveActivity(sessionId);
    }

    // Check capacity
    if (instance.config.maxParticipants > 0 &&
        instance.participants.size >= instance.config.maxParticipants) {
      this.callbacks.onActivityFull?.(activityId, sessionId);
      return false;
    }

    // Check contact consent if required
    if (instance.config.requiresContactConsent) {
      if (this.consentChecker && !this.consentChecker(sessionId, instance.config.type)) {
        return false;
      }
    }

    // Find available slot
    const slotIndex = this.findAvailableSlot(instance);

    // Join
    const participant: ActivityParticipant = {
      sessionId,
      joinedAt: Date.now(),
      animation: instance.config.animations.length > 0 ? instance.config.animations[0] : null,
      slotIndex,
    };

    instance.participants.set(sessionId, participant);
    this.playerActivities.set(sessionId, activityId);

    this.callbacks.onPlayerJoined?.(activityId, sessionId, instance.participants.size);

    return true;
  }

  /**
   * Player leaves their current shared activity.
   * Always allowed (freeExit is enforced).
   */
  leaveActivity(sessionId: string): boolean {
    const activityId = this.playerActivities.get(sessionId);
    if (!activityId) return false;

    const instance = this.activities.get(activityId);
    if (!instance) {
      this.playerActivities.delete(sessionId);
      return false;
    }

    instance.participants.delete(sessionId);
    this.playerActivities.delete(sessionId);

    this.callbacks.onPlayerLeft?.(activityId, sessionId, instance.participants.size);

    return true;
  }

  /**
   * Set a player's animation within their activity.
   * Only from the approved animations list for that activity.
   */
  setParticipantAnimation(sessionId: string, animation: string): boolean {
    const activityId = this.playerActivities.get(sessionId);
    if (!activityId) return false;

    const instance = this.activities.get(activityId);
    if (!instance) return false;

    // Validate animation is allowed
    if (!instance.config.animations.includes(animation)) return false;

    const participant = instance.participants.get(sessionId);
    if (!participant) return false;

    participant.animation = animation;
    return true;
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get the activity a player is currently in */
  getPlayerActivity(sessionId: string): string | null {
    return this.playerActivities.get(sessionId) ?? null;
  }

  /** Is this player in any shared activity? */
  isInActivity(sessionId: string): boolean {
    return this.playerActivities.has(sessionId);
  }

  /** Is this player in a specific activity? */
  isInSpecificActivity(sessionId: string, activityId: string): boolean {
    return this.playerActivities.get(sessionId) === activityId;
  }

  /** Get all participants in an activity */
  getParticipants(activityId: string): ActivityParticipant[] {
    const instance = this.activities.get(activityId);
    if (!instance) return [];
    return Array.from(instance.participants.values());
  }

  /** Get participant count for an activity */
  getParticipantCount(activityId: string): number {
    return this.activities.get(activityId)?.participants.size ?? 0;
  }

  /** Is this activity at capacity? */
  isActivityFull(activityId: string): boolean {
    const instance = this.activities.get(activityId);
    if (!instance) return true;
    if (instance.config.maxParticipants === 0) return false; // Unlimited
    return instance.participants.size >= instance.config.maxParticipants;
  }

  /** Get an activity instance */
  getActivity(activityId: string): SharedActivityInstance | null {
    return this.activities.get(activityId) ?? null;
  }

  /** Get all active activities */
  getActiveActivities(): SharedActivityInstance[] {
    return Array.from(this.activities.values()).filter(a => a.isActive);
  }

  /** Get activities near a position (for proximity-based UI prompts) */
  getActivitiesNearPosition(position: Vec3, maxDistance: number = 5): SharedActivityInstance[] {
    const results: SharedActivityInstance[] = [];
    for (const instance of this.activities.values()) {
      if (!instance.isActive || !instance.config.enabled) continue;
      const pos = instance.config.position;
      const dx = position[0] - pos[0];
      const dz = position[2] - pos[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= maxDistance) {
        results.push(instance);
      }
    }
    return results;
  }

  /** Get activities by zone */
  getActivitiesByZone(zoneId: string): SharedActivityInstance[] {
    return Array.from(this.activities.values())
      .filter(a => a.config.zoneId === zoneId);
  }

  // ─── Activity Control ──────────────────────────────────────────────────

  /** Enable/disable an activity */
  setActivityEnabled(activityId: string, enabled: boolean): void {
    const instance = this.activities.get(activityId);
    if (!instance) return;
    instance.config.enabled = enabled;
    if (!enabled) {
      // Remove all participants gracefully
      for (const sessionId of Array.from(instance.participants.keys())) {
        this.leaveActivity(sessionId);
      }
    }
  }

  /** Pause/resume an activity */
  setActivityActive(activityId: string, active: boolean): void {
    const instance = this.activities.get(activityId);
    if (!instance) return;
    instance.isActive = active;
    if (!active) {
      this.callbacks.onActivityEnded?.(activityId);
    } else {
      this.callbacks.onActivityStarted?.(activityId);
    }
  }

  // ─── Sync State ────────────────────────────────────────────────────────

  /** Get sync-friendly state for multiplayer broadcast */
  getSyncState(): Array<{
    activityId: string;
    participants: Array<{ sessionId: string; animation: string | null; slotIndex: number | null }>;
  }> {
    const state: Array<{
      activityId: string;
      participants: Array<{ sessionId: string; animation: string | null; slotIndex: number | null }>;
    }> = [];

    for (const [activityId, instance] of this.activities) {
      if (instance.participants.size === 0) continue;
      state.push({
        activityId,
        participants: Array.from(instance.participants.values()).map(p => ({
          sessionId: p.sessionId,
          animation: p.animation,
          slotIndex: p.slotIndex,
        })),
      });
    }

    return state;
  }

  /** Apply remote sync state */
  applySyncState(state: Array<{
    activityId: string;
    participants: Array<{ sessionId: string; animation: string | null; slotIndex: number | null }>;
  }>): void {
    for (const entry of state) {
      const instance = this.activities.get(entry.activityId);
      if (!instance) continue;

      // Update participant list from remote state
      const remoteIds = new Set(entry.participants.map(p => p.sessionId));

      // Remove participants not in remote state
      for (const sessionId of Array.from(instance.participants.keys())) {
        if (!remoteIds.has(sessionId)) {
          instance.participants.delete(sessionId);
          this.playerActivities.delete(sessionId);
        }
      }

      // Add/update participants from remote state
      for (const remote of entry.participants) {
        if (!instance.participants.has(remote.sessionId)) {
          instance.participants.set(remote.sessionId, {
            sessionId: remote.sessionId,
            joinedAt: Date.now(),
            animation: remote.animation,
            slotIndex: remote.slotIndex,
          });
          this.playerActivities.set(remote.sessionId, entry.activityId);
        } else {
          const existing = instance.participants.get(remote.sessionId)!;
          existing.animation = remote.animation;
          existing.slotIndex = remote.slotIndex;
        }
      }
    }
  }

  // ─── Disconnect Handling ───────────────────────────────────────────────

  /** Remove a disconnected player from all activities */
  handleDisconnect(sessionId: string): void {
    this.leaveActivity(sessionId);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Clear all activities and participants */
  dispose(): void {
    for (const sessionId of Array.from(this.playerActivities.keys())) {
      this.leaveActivity(sessionId);
    }
    this.activities.clear();
    this.playerActivities.clear();
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private findAvailableSlot(instance: SharedActivityInstance): number | null {
    if (instance.config.maxParticipants === 0) return null; // No fixed slots

    const usedSlots = new Set<number>();
    for (const p of instance.participants.values()) {
      if (p.slotIndex !== null) usedSlots.add(p.slotIndex);
    }

    for (let i = 0; i < instance.config.maxParticipants; i++) {
      if (!usedSlots.has(i)) return i;
    }

    return null;
  }
}
